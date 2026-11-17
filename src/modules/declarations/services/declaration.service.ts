import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, Errors } from "@/lib/errors";
import { assertPermission } from "@/server/policies/guards";
import { scopeIncludes, scopeWhere } from "@/modules/geography/scope";
import { getHierarchyByRue } from "@/modules/geography/repositories/geography.repository";
import { findPotentialDuplicates } from "@/modules/citizens/repositories/citizen.repository";
import { auditBestEffort, writeAudit } from "@/modules/audit/services/audit.service";
import { allocateNiu, allocateNumber } from "@/modules/niu/services/niu.service";
import { canDecide, isChainComplete } from "@/modules/declarations/workflow";
import { getValidationDirecte } from "@/modules/settings/services/settings.service";
import { estValidationDirecte } from "@/modules/settings/settings";
import type { RoleCode } from "@/modules/roles/permissions";
import {
  arriveeData, decesData, identificationData,
  type CreateDeclarationInput, type DecisionInput, type ListDeclarationsQuery,
} from "@/modules/declarations/schemas/declaration.schema";
import { toDate } from "@/lib/dates";
import type { AuthContext } from "@/types/auth";

type Tx = Prisma.TransactionClient;
export const DECLARATIONS_PAGE_SIZE = 25;

/** Rôles de la chaîne ayant un titulaire ACTIF qui couvre cette déclaration (les autres niveaux sont ignorés). */
export async function activeApproverRoles(db: Tx | typeof prisma, geo: { quartierId: string; communeId: string }): Promise<RoleCode[]> {
  const rows = await db.utilisateur.findMany({
    where: {
      actif: true,
      OR: [
        { roleCode: "CHEF_QUARTIER", affectation: { is: { quartierId: geo.quartierId } } },
        { roleCode: { in: ["CHEF_BUREAU", "BOURGMESTRE"] }, affectation: { is: { communeId: geo.communeId } } },
        { roleCode: "ADMIN" },
      ],
    },
    select: { roleCode: true },
  });
  return [...new Set<RoleCode>(rows.map((r) => r.roleCode as RoleCode))];
}

export async function createDeclaration(ctx: AuthContext, input: CreateDeclarationInput) {
  assertPermission(ctx, "declarations:create");
  // Une déclaration est toujours déposée depuis SA rue : le lieu vient du périmètre, jamais du corps de la requête.
  if (ctx.scope.level !== "RUE" || !ctx.scope.rueId) throw Errors.forbidden("Seul un chef de rue affecté à une rue peut déposer une déclaration.");
  const h = await getHierarchyByRue(prisma, ctx.scope.rueId);
  if (!h) throw Errors.notFound();

  let citoyenId: string | null = null;
  let donnees: Prisma.InputJsonValue;

  if (input.type === "IDENTIFICATION" || input.type === "NAISSANCE") {
    const doublons = await findPotentialDuplicates(prisma, input.personne);
    if (doublons.length > 0 && !input.confirmerDoublon) {
      throw new AppError(409, "DUPLICATE_SUSPECTED", "Un dossier identique (nom, postnom, prénom, sexe, naissance) existe déjà.", {
        correspondances: doublons.map((d) => (scopeIncludes(ctx.scope, d) ? { niu: d.niu } : { masque: true })),
      });
    }
    donnees = { personne: input.personne, doublonConfirme: !!input.confirmerDoublon };
  } else {
    const c = await prisma.citoyen.findUnique({ where: { niu: input.niu }, select: { id: true, statut: true, rueId: true, provinceId: true, communeId: true, quartierId: true } });
    if (!c) throw Errors.validation([{ champ: "niu", message: "NIU inconnu" }]);
    if (c.statut === "DECEDE") throw Errors.conflict("Ce citoyen est déjà déclaré décédé.");
    if (input.type === "ARRIVEE") {
      if (c.rueId === h.rueId && c.statut === "RESIDENT") throw Errors.conflict("Ce citoyen réside déjà dans cette rue.");
    } else if (!scopeIncludes(ctx.scope, c)) {
      throw Errors.notFound("NIU introuvable dans votre rue.");
    }
    const dejaEnCours = await prisma.declaration.findFirst({ where: { citoyenId: c.id, type: input.type, statut: "EN_ATTENTE" }, select: { numero: true } });
    if (dejaEnCours) throw Errors.conflict(`Une déclaration du même type est déjà en cours (${dejaEnCours.numero}).`);
    citoyenId = c.id;
    const { type: _t, ...rest } = input;
    void _t;
    donnees = rest as Prisma.InputJsonValue;
  }

  // Réglage de l'administrateur, lu AVANT la transaction (en cas d'échec : chaîne complète, le comportement le plus strict).
  const direct = estValidationDirecte(ctx.user.roleCode, input.type, await getValidationDirecte());

  return prisma.$transaction(async (tx) => {
    const numero = await allocateNumber(tx, "DCL");
    const d = await tx.declaration.create({
      data: {
        numero, type: input.type, citoyenId, donnees,
        provinceId: h.provinceId, communeId: h.communeId, quartierId: h.quartierId, rueId: h.rueId, creePar: ctx.user.id,
      },
      select: { id: true, numero: true, statut: true },
    });
    await writeAudit(tx, ctx, { action: "DECLARATION_CREEE", entite: "Declaration", entiteId: d.id, details: { numero, type: input.type, validationDirecte: direct } });
    if (!direct) return { ...d, niu: null as string | null };

    // Validation directe : effets métier, approbation tracée et statut final dans la MÊME transaction que le dépôt.
    const row = await tx.declaration.findUniqueOrThrow({ where: { id: d.id }, include: { approbations: { select: { roleCode: true } } } });
    const niu = await applyEffects(tx, row);
    await tx.declarationApprobation.create({
      data: { declarationId: d.id, userId: ctx.user.id, roleCode: ctx.user.roleCode, decision: "APPROUVEE", motif: "Validation directe (réglage de l'administrateur)" },
    });
    await tx.declaration.update({ where: { id: d.id }, data: { statut: "VALIDEE", decideeLe: new Date() } });
    await writeAudit(tx, ctx, { action: "DECLARATION_VALIDEE_DIRECTE", entite: "Declaration", entiteId: d.id, details: { numero, type: input.type, niu } });
    return { ...d, statut: "VALIDEE" as const, niu };
  });
}

export async function listDeclarations(ctx: AuthContext, query: ListDeclarationsQuery) {
  assertPermission(ctx, "declarations:read");
  const where: Prisma.DeclarationWhereInput = { ...(query.statut ? { statut: query.statut } : {}), ...scopeWhere(ctx.scope) };
  const [total, rows] = await Promise.all([
    prisma.declaration.count({ where }),
    prisma.declaration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * DECLARATIONS_PAGE_SIZE,
      take: DECLARATIONS_PAGE_SIZE,
      select: {
        id: true, numero: true, type: true, statut: true, motifRejet: true, createdAt: true, donnees: true,
        quartierId: true, communeId: true,
        quartier: { select: { nom: true } }, rue: { select: { nom: true } },
        auteur: { select: { nomComplet: true } },
        approbations: { select: { roleCode: true, decision: true } },
      },
    }),
  ]);
  const cache = new Map<string, RoleCode[]>();
  const items: Array<(typeof rows)[number] & { aMonTour: boolean }> = [];
  for (const r of rows) {
    let aMonTour = false;
    if (r.statut === "EN_ATTENTE") {
      const key = `${r.communeId}|${r.quartierId}`;
      if (!cache.has(key)) cache.set(key, await activeApproverRoles(prisma, r));
      aMonTour = canDecide(ctx.user.roleCode, cache.get(key) ?? [], r.approbations.map((a) => a.roleCode as RoleCode));
    }
    items.push({ ...r, aMonTour });
  }
  return { items, total, page: query.page, pageSize: DECLARATIONS_PAGE_SIZE };
}

export async function decideDeclaration(ctx: AuthContext, id: string, input: DecisionInput) {
  assertPermission(ctx, "declarations:decide");
  const result = await prisma.$transaction(async (tx) => {
    const d = await tx.declaration.findUnique({ where: { id }, include: { approbations: { select: { roleCode: true } } } });
    if (!d) throw Errors.notFound();
    if (!scopeIncludes(ctx.scope, d)) {
      await auditBestEffort(ctx, { action: "ACCES_HORS_PERIMETRE", entite: "Declaration", entiteId: id });
      throw Errors.notFound();
    }
    if (d.statut !== "EN_ATTENTE") throw Errors.conflict("Cette déclaration est déjà traitée.");

    const active = await activeApproverRoles(tx, d);
    const approved = d.approbations.map((a) => a.roleCode as RoleCode);
    if (!canDecide(ctx.user.roleCode, active, approved)) throw Errors.conflict("Ce n'est pas encore (ou plus) votre tour dans la chaîne de validation.");

    // La contrainte UNIQUE (declarationId, roleCode) rend toute double décision impossible, même en concurrence.
    await tx.declarationApprobation.create({
      data: { declarationId: id, userId: ctx.user.id, roleCode: ctx.user.roleCode, decision: input.decision, motif: input.motif ?? null },
    });

    if (input.decision === "REJETEE") {
      await tx.declaration.update({ where: { id }, data: { statut: "REJETEE", motifRejet: input.motif ?? null, decideeLe: new Date() } });
      await writeAudit(tx, ctx, { action: "DECLARATION_REJETEE", entite: "Declaration", entiteId: id, details: { numero: d.numero, motif: input.motif ?? null } });
      return { statut: "REJETEE" as const, numero: d.numero, niu: null as string | null };
    }

    if (!isChainComplete(active, [...approved, ctx.user.roleCode])) {
      await writeAudit(tx, ctx, { action: "DECLARATION_APPROUVEE_NIVEAU", entite: "Declaration", entiteId: id, details: { numero: d.numero, niveau: ctx.user.roleCode } });
      return { statut: "EN_ATTENTE" as const, numero: d.numero, niu: null as string | null };
    }

    const niu = await applyEffects(tx, d);
    await tx.declaration.update({ where: { id }, data: { statut: "VALIDEE", decideeLe: new Date() } });
    await writeAudit(tx, ctx, { action: "DECLARATION_VALIDEE", entite: "Declaration", entiteId: id, details: { numero: d.numero, type: d.type, niu } });
    return { statut: "VALIDEE" as const, numero: d.numero, niu };
  });
  return result;
}

type DeclarationRow = Prisma.DeclarationGetPayload<{ include: { approbations: { select: { roleCode: true } } } }>;

/** Effets métier de la validation finale, dans la MÊME transaction que la décision. Retourne le NIU concerné. */
async function applyEffects(tx: Tx, d: DeclarationRow): Promise<string | null> {
  switch (d.type) {
    case "IDENTIFICATION":
    case "NAISSANCE": {
      const { personne: p } = identificationData.parse(d.donnees);
      const h = await getHierarchyByRue(tx, d.rueId);
      if (!h) throw Errors.conflict("La rue de la déclaration n'existe plus.");
      const niu = await allocateNiu(tx, h.codes);
      const [pere, mere] = await Promise.all([
        p.pereNiu ? tx.citoyen.findUnique({ where: { niu: p.pereNiu }, select: { id: true } }) : null,
        p.mereNiu ? tx.citoyen.findUnique({ where: { niu: p.mereNiu }, select: { id: true } }) : null,
      ]);
      const c = await tx.citoyen.create({
        data: {
          niu, nom: p.nom, postnom: p.postnom, prenom: p.prenom, sexe: p.sexe,
          dateNaissance: toDate(p.dateNaissance), lieuNaissance: p.lieuNaissance ?? null, adresse: p.adresse ?? null,
          provinceId: d.provinceId, communeId: d.communeId, quartierId: d.quartierId, rueId: d.rueId,
          pereId: pere?.id ?? null, mereId: mere?.id ?? null, creePar: d.creePar,
        },
        select: { id: true },
      });
      await tx.declaration.update({ where: { id: d.id }, data: { citoyenId: c.id } });
      return niu;
    }
    case "DECES": {
      const { dateDeces } = decesData.parse(d.donnees);
      if (!d.citoyenId) throw Errors.conflict("Citoyen introuvable.");
      const c = await tx.citoyen.update({ where: { id: d.citoyenId }, data: { statut: "DECEDE", dateDeces: toDate(dateDeces) }, select: { niu: true } });
      await tx.carteIdentite.updateMany({ where: { citoyenId: d.citoyenId, statut: "ACTIVE" }, data: { statut: "REVOQUEE" } });
      return c.niu;
    }
    case "DEPART": {
      if (!d.citoyenId) throw Errors.conflict("Citoyen introuvable.");
      const c = await tx.citoyen.update({ where: { id: d.citoyenId }, data: { statut: "EN_DEPLACEMENT" }, select: { niu: true } });
      return c.niu;
    }
    case "ARRIVEE": {
      arriveeData.parse(d.donnees);
      if (!d.citoyenId) throw Errors.conflict("Citoyen introuvable.");
      // Le NIU est un identifiant À VIE : il ne change pas ; seul le rattachement géographique est mis à jour.
      const c = await tx.citoyen.update({
        where: { id: d.citoyenId },
        data: { statut: "RESIDENT", provinceId: d.provinceId, communeId: d.communeId, quartierId: d.quartierId, rueId: d.rueId },
        select: { niu: true },
      });
      return c.niu;
    }
    default:
      throw Errors.conflict("Type de déclaration non géré.");
  }
}
