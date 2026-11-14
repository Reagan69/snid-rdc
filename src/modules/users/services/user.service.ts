import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { generatePassword } from "@/lib/password-generator";
import { validatePassword } from "@/lib/password-policy";
import { revokeAllSessions } from "@/lib/session";
import { toDate } from "@/lib/dates";
import { assertPermission } from "@/server/policies/guards";
import { MANAGEABLE_ROLES, ROLE_SCOPE_LEVEL, canManageRole, isRoleCode } from "@/modules/roles/permissions";
import { scopeContains, scopeWhere, type Scope, type ScopeLevel } from "@/modules/geography/scope";
import {
  ensureRue, getHierarchyByCommune, getHierarchyByQuartier, getHierarchyByRue,
} from "@/modules/geography/repositories/geography.repository";
import { writeAudit } from "@/modules/audit/services/audit.service";
import type { CreateUserInput, UpdateUserInput } from "@/modules/users/schemas/user.schema";
import type { AuthContext } from "@/types/auth";

const userSelect = {
  id: true, username: true, nomComplet: true, roleCode: true, actif: true, motifSuspension: true, totpActif: true,
  telephone: true, email: true, dateDebutFonction: true, demo: true, derniereConnexion: true, createdAt: true, creePar: true,
  affectation: { select: { niveau: true, circonscription: { select: { nom: true } }, province: { select: { nom: true } }, commune: { select: { nom: true } }, quartier: { select: { nom: true } }, rue: { select: { nom: true } } } },
} satisfies Prisma.UtilisateurSelect;

export async function listUsers(ctx: AuthContext) {
  assertPermission(ctx, "users:read");
  const roles = MANAGEABLE_ROLES[ctx.user.roleCode];
  if (roles.length === 0) return [];
  const rows = await prisma.utilisateur.findMany({
    where: { roleCode: { in: [...roles] }, supprimeLe: null, affectation: { is: scopeWhere(ctx.scope) } },
    select: userSelect,
    orderBy: [{ roleCode: "asc" }, { nomComplet: "asc" }],
    take: 500,
  });
  return withCreators(rows);
}

/** Supervision : ajoute à chaque compte l'identité de celui qui l'a ouvert (visible de l'administrateur). */
async function withCreators<T extends { creePar: string | null }>(rows: T[]) {
  const ids = [...new Set(rows.map((r) => r.creePar).filter((x): x is string => !!x))];
  const creators = ids.length ? await prisma.utilisateur.findMany({ where: { id: { in: ids } }, select: { id: true, nomComplet: true, username: true } }) : [];
  const byId = new Map(creators.map((c) => [c.id, c]));
  return rows.map((r) => ({ ...r, createur: r.creePar ? byId.get(r.creePar) ?? null : null }));
}

/** Un gouverneur actif par province, un bourgmestre actif par commune. */
async function assertSingleHolder(tx: Prisma.TransactionClient, role: string, scope: Scope) {
  if (role === "GOUVERNEUR" && scope.provinceId) {
    const n = await tx.utilisateur.count({ where: { roleCode: "GOUVERNEUR", actif: true, affectation: { is: { provinceId: scope.provinceId } } } });
    if (n > 0) throw Errors.conflict("Cette province a déjà un gouverneur actif. Suspendez-le avant d'en créer un nouveau.");
  }
  if (role === "BOURGMESTRE" && scope.communeId) {
    const n = await tx.utilisateur.count({ where: { roleCode: "BOURGMESTRE", actif: true, affectation: { is: { communeId: scope.communeId } } } });
    if (n > 0) throw Errors.conflict("Cette commune a déjà un bourgmestre actif.");
  }
}

export async function createUser(ctx: AuthContext, input: CreateUserInput) {
  assertPermission(ctx, "users:create");
  if (!canManageRole(ctx.user.roleCode, input.roleCode)) throw Errors.forbidden("Vous ne pouvez pas créer ce type de compte.");
  const level: ScopeLevel = ROLE_SCOPE_LEVEL[input.roleCode];

  const generated = input.password === undefined || input.password === "";
  const password = generated ? generatePassword() : (input.password as string);
  if (!generated) {
    const issue = validatePassword(password, input.username);
    if (issue) throw Errors.validation([{ champ: "password", message: issue }]);
  }
  const passwordHash = await hashPassword(password);

  const created = await prisma.$transaction(async (tx) => {
    // 0. Identifiant : unique, et jamais réutilisé après suppression (le journal d'audit doit rester sans ambiguïté).
    if (await tx.utilisateur.findUnique({ where: { username: input.username }, select: { id: true } })) throw Errors.conflict("Cet identifiant est déjà utilisé.");
    if (await tx.journalAudit.findFirst({ where: { username: input.username }, select: { id: true } })) {
      throw Errors.conflict("Cet identifiant a déjà servi à un compte supprimé : choisissez-en un autre, pour que l'historique d'audit reste sans ambiguïté.");
    }
    // 1. Résolution du périmètre complet (chaîne d'ancêtres) depuis l'identifiant le plus bas fourni.
    let scope: Scope;
    let rueId: string;
    let circonscriptionId: string | null = null;
    if (level === "NATIONAL") {
      scope = { level };
    } else if (level === "PROVINCE") {
      if (input.roleCode === "CIRCONSCRIPTION") {
        // La province est déduite de la circonscription : le compte ne peut pas être rattaché à une province incohérente.
        if (!input.circonscriptionId) throw Errors.validation([{ champ: "circonscriptionId", message: "Circonscription obligatoire" }]);
        const c = await tx.circonscription.findUnique({ where: { id: input.circonscriptionId }, select: { provinceId: true, actif: true } });
        if (!c || !c.actif) throw Errors.validation([{ champ: "circonscriptionId", message: "Circonscription inconnue ou inactive" }]);
        circonscriptionId = input.circonscriptionId;
        scope = { level, provinceId: c.provinceId };
      } else {
        if (!input.provinceId) throw Errors.validation([{ champ: "provinceId", message: "Province obligatoire" }]);
        const p = await tx.province.findUnique({ where: { id: input.provinceId }, select: { id: true } });
        if (!p) throw Errors.validation([{ champ: "provinceId", message: "Province inconnue" }]);
        scope = { level, provinceId: p.id };
      }
    } else if (level === "COMMUNE") {
      if (!input.communeId) throw Errors.validation([{ champ: "communeId", message: "Commune obligatoire" }]);
      const h = await getHierarchyByCommune(tx, input.communeId);
      if (!h) throw Errors.validation([{ champ: "communeId", message: "Commune inconnue" }]);
      scope = { level, ...h };
    } else if (level === "QUARTIER") {
      if (!input.quartierId) throw Errors.validation([{ champ: "quartierId", message: "Quartier obligatoire" }]);
      const h = await getHierarchyByQuartier(tx, input.quartierId);
      if (!h) throw Errors.validation([{ champ: "quartierId", message: "Quartier inconnu" }]);
      scope = { level, ...h };
    } else {
      // CHEF_RUE : rue existante, ou création de la rue dans le quartier (enregistrement des avenues par le quartier).
      if (input.rueId) rueId = input.rueId;
      else if (input.quartierId && input.rueNom) {
        const q = await getHierarchyByQuartier(tx, input.quartierId);
        if (!q) throw Errors.validation([{ champ: "quartierId", message: "Quartier inconnu" }]);
        const quartierScope: Scope = { level: "QUARTIER", ...q };
        if (!scopeContains(ctx.scope, quartierScope)) throw Errors.forbidden("Hors de votre périmètre.");
        rueId = await ensureRue(tx, input.quartierId, input.rueNom);
      } else throw Errors.validation([{ champ: "rueId", message: "Rue obligatoire (rueId, ou quartierId + rueNom)" }]);
      const h = await getHierarchyByRue(tx, rueId);
      if (!h) throw Errors.validation([{ champ: "rueId", message: "Rue inconnue" }]);
      scope = { level, provinceId: h.provinceId, communeId: h.communeId, quartierId: h.quartierId, rueId: h.rueId };
    }
    // 2. Le nouveau périmètre doit être ENTIÈREMENT dans celui du créateur.
    if (!scopeContains(ctx.scope, scope)) throw Errors.forbidden("Ce périmètre est hors de votre juridiction.");
    await assertSingleHolder(tx, input.roleCode, scope);

    const u = await tx.utilisateur.create({
      data: {
        username: input.username, nomComplet: input.nomComplet, passwordHash, roleCode: input.roleCode,
        mustChangePassword: true, telephone: input.telephone ?? null, email: input.email ?? null,
        dateDebutFonction: input.dateDebutFonction ? toDate(input.dateDebutFonction) : null, creePar: ctx.user.id,
        affectation: { create: { niveau: level, provinceId: scope.provinceId ?? null, communeId: scope.communeId ?? null, quartierId: scope.quartierId ?? null, rueId: scope.rueId ?? null, circonscriptionId } },
      },
      select: { id: true, username: true },
    });
    await writeAudit(tx, ctx, { action: "UTILISATEUR_CREE", entite: "Utilisateur", entiteId: u.id, details: { username: u.username, role: input.roleCode, niveau: level } });
    return u;
  });
  return { ...created, motDePasseInitial: generated ? password : undefined };
}

/** Charge un compte gérable : dans le périmètre de l'acteur ET d'un rôle subordonné ; sinon 404 / 403. */
async function loadManageable(ctx: AuthContext, id: string) {
  assertPermission(ctx, "users:update");
  const t = await prisma.utilisateur.findUnique({ where: { id }, include: { affectation: true } });
  if (!t || !t.affectation || t.supprimeLe) throw Errors.notFound();
  const a = t.affectation;
  const targetScope: Scope = { level: a.niveau, provinceId: a.provinceId, communeId: a.communeId, quartierId: a.quartierId, rueId: a.rueId };
  if (!scopeContains(ctx.scope, targetScope)) throw Errors.notFound();
  if (!isRoleCode(t.roleCode) || !canManageRole(ctx.user.roleCode, t.roleCode)) throw Errors.forbidden("Vous ne pouvez pas gérer ce compte.");
  return t;
}

export async function updateUser(ctx: AuthContext, id: string, input: UpdateUserInput) {
  const target = await loadManageable(ctx, id);
  switch (input.action) {
    case "SUSPENDRE": {
      await prisma.$transaction(async (tx) => {
        await tx.utilisateur.update({ where: { id }, data: { actif: false, motifSuspension: input.motif } });
        await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        await writeAudit(tx, ctx, { action: "UTILISATEUR_SUSPENDU", entite: "Utilisateur", entiteId: id, details: { username: target.username, motif: input.motif } });
      });
      return { ok: true };
    }
    case "SUPPRIMER": {
      assertPermission(ctx, "users:delete");
      if (id === ctx.user.id) throw Errors.forbidden("Vous ne pouvez pas supprimer votre propre compte.");
      const mode = await prisma.$transaction(async (tx) => {
        // Un compte qui a agi (déclarations, approbations, cartes, candidature) est ARCHIVÉ : l'historique légal reste intact.
        // Un compte qui n'a jamais agi est effacé ; le journal d'audit conserve son identifiant (lien en SetNull).
        const u = await tx.utilisateur.findUniqueOrThrow({
          where: { id },
          select: { _count: { select: { declarations: true, approbations: true, cartesEmises: true, cartesSignees: true } }, candidature: { select: { id: true } } },
        });
        const c = u._count;
        const aAgi = c.declarations + c.approbations + c.cartesEmises + c.cartesSignees > 0 || !!u.candidature;
        const subordonnes = await tx.utilisateur.count({ where: { creePar: id, supprimeLe: null } });
        await writeAudit(tx, ctx, { action: "UTILISATEUR_SUPPRIME", entite: "Utilisateur", entiteId: id, details: { username: target.username, role: target.roleCode, mode: aAgi ? "archive" : "definitive", motif: input.motif, subordonnes } });
        if (aAgi) {
          await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
          await tx.utilisateur.update({ where: { id }, data: { supprimeLe: new Date(), actif: false, motifSuspension: `Supprimé : ${input.motif}` } });
        } else {
          await tx.utilisateur.delete({ where: { id } }); // sessions et affectation partent en cascade
        }
        return aAgi ? ("archive" as const) : ("definitive" as const);
      });
      return { ok: true, mode };
    }
    case "REACTIVER": {
      await prisma.$transaction(async (tx) => {
        const scope = target.affectation;
        if (scope) await assertSingleHolder(tx, target.roleCode, { level: scope.niveau, provinceId: scope.provinceId, communeId: scope.communeId });
        await tx.utilisateur.update({ where: { id }, data: { actif: true, motifSuspension: null, echecsConnexion: 0, verrouilleJusqua: null } });
        await writeAudit(tx, ctx, { action: "UTILISATEUR_REACTIVE", entite: "Utilisateur", entiteId: id, details: { username: target.username } });
      });
      return { ok: true };
    }
    case "MODIFIER": {
      const { action: _a, dateDebutFonction, ...rest } = input;
      void _a;
      await prisma.$transaction(async (tx) => {
        await tx.utilisateur.update({ where: { id }, data: { ...rest, ...(dateDebutFonction ? { dateDebutFonction: toDate(dateDebutFonction) } : {}) } });
        await writeAudit(tx, ctx, { action: "UTILISATEUR_MODIFIE", entite: "Utilisateur", entiteId: id, details: { username: target.username, champs: Object.keys(rest) } });
      });
      return { ok: true };
    }
    case "REINITIALISER_MOT_DE_PASSE": {
      const motDePasseInitial = generatePassword();
      const passwordHash = await hashPassword(motDePasseInitial);
      await prisma.$transaction(async (tx) => {
        await tx.utilisateur.update({ where: { id }, data: { passwordHash, mustChangePassword: true, echecsConnexion: 0, verrouilleJusqua: null } });
        await writeAudit(tx, ctx, { action: "MOT_DE_PASSE_REINITIALISE", entite: "Utilisateur", entiteId: id, details: { username: target.username } });
      });
      await revokeAllSessions(id);
      return { ok: true, motDePasseInitial };
    }
    case "REINITIALISER_MFA": {
      await prisma.$transaction(async (tx) => {
        await tx.utilisateur.update({ where: { id }, data: { totpActif: false, totpSecretChiffre: null } });
        await writeAudit(tx, ctx, { action: "MFA_REINITIALISEE", entite: "Utilisateur", entiteId: id, details: { username: target.username } });
      });
      await revokeAllSessions(id);
      return { ok: true };
    }
  }
}

/** Les 26 provinces et leur gouverneur actuel (actif d'abord, sinon le plus récent). */
export async function listGovernors(ctx: AuthContext) {
  assertPermission(ctx, "governors:read");
  const [provinces, governors] = await Promise.all([
    prisma.province.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, nom: true, chefLieu: true, statut: true } }),
    prisma.utilisateur.findMany({
      where: { roleCode: "GOUVERNEUR", supprimeLe: null },
      select: { id: true, username: true, nomComplet: true, actif: true, telephone: true, email: true, dateDebutFonction: true, demo: true, createdAt: true, affectation: { select: { provinceId: true } } },
      orderBy: [{ actif: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const byProvince = new Map<string, (typeof governors)[number]>();
  for (const g of governors) {
    const pid = g.affectation?.provinceId;
    if (pid && !byProvince.has(pid)) byProvince.set(pid, g);
  }
  return provinces.map((p) => ({ province: p, gouverneur: byProvince.get(p.id) ?? null }));
}

/** Comptes d'une institution nationale et de ses services (ex. DGM + agents) : actifs d'abord, puis les plus récents. */
export async function listInstitutionAccounts(ctx: AuthContext, roles: readonly string[]) {
  assertPermission(ctx, "institutions:read");
  const rows = await prisma.utilisateur.findMany({
    where: { roleCode: { in: [...roles] }, supprimeLe: null },
    select: { id: true, username: true, nomComplet: true, roleCode: true, actif: true, motifSuspension: true, totpActif: true, telephone: true, email: true, dateDebutFonction: true, demo: true, derniereConnexion: true, creePar: true },
    orderBy: [{ actif: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return withCreators(rows);
}
