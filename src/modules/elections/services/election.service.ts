import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, Errors } from "@/lib/errors";
import { toDate, toIso, todayIso } from "@/lib/dates";
import { assertPermission } from "@/server/policies/guards";
import { scopeIncludes } from "@/modules/geography/scope";
import { writeAudit } from "@/modules/audit/services/audit.service";
import {
  isElectorSpaceVisible, isLegislative, nextStatut, voterAgeOk, type TypeScrutin,
} from "@/modules/elections/rules";
import type {
  CreateCirconscriptionInput, CreateScrutinInput, ScrutinActionInput, SiegesInput,
} from "@/modules/elections/schemas/election.schema";
import type { AuthContext } from "@/types/auth";

/** Rôle CIRCONSCRIPTION : identifiant de SA circonscription (toujours imposé côté serveur). Autres rôles : null. */
export function ownCirconscription(ctx: AuthContext): string | null {
  if (ctx.user.roleCode !== "CIRCONSCRIPTION") return null;
  if (!ctx.circonscriptionId) throw Errors.forbidden("Compte non rattaché à une circonscription.");
  return ctx.circonscriptionId;
}

const scrutinSelect = {
  id: true, code: true, libelle: true, type: true, statut: true, dateScrutin: true, ouvertLe: true, closLe: true,
} satisfies Prisma.ScrutinSelect;

// ───────────────────────── Scrutins ─────────────────────────

export async function listScrutins(ctx: AuthContext) {
  assertPermission(ctx, "elections:read");
  return prisma.scrutin.findMany({
    select: { ...scrutinSelect, _count: { select: { circonscriptions: true, candidatures: true } } },
    orderBy: [{ dateScrutin: "desc" }, { code: "asc" }],
    take: 100,
  });
}

export async function getScrutin(ctx: AuthContext, id: string) {
  assertPermission(ctx, "elections:read");
  const own = ownCirconscription(ctx);
  const s = await prisma.scrutin.findUnique({
    where: { id },
    select: {
      ...scrutinSelect,
      circonscriptions: {
        where: own ? { circonscriptionId: own } : {},
        orderBy: { circonscription: { nom: "asc" } },
        select: {
          circonscriptionId: true, sieges: true, inscrits: true, votants: true, nuls: true, saisiLe: true, publie: true, publieLe: true,
          circonscription: { select: { code: true, nom: true, province: { select: { nom: true } } } },
        },
      },
    },
  });
  if (!s) throw Errors.notFound();
  return s;
}

export async function createScrutin(ctx: AuthContext, input: CreateScrutinInput) {
  assertPermission(ctx, "elections:manage");
  if (input.dateScrutin < todayIso()) throw Errors.validation([{ champ: "dateScrutin", message: "La date du scrutin ne peut pas être passée." }]);
  try {
    return await prisma.$transaction(async (tx) => {
      const s = await tx.scrutin.create({
        data: { code: input.code, libelle: input.libelle, type: input.type, dateScrutin: toDate(input.dateScrutin), creePar: ctx.user.id },
        select: { id: true, code: true, statut: true },
      });
      await writeAudit(tx, ctx, { action: "SCRUTIN_CREE", entite: "Scrutin", entiteId: s.id, details: { code: s.code, type: input.type, date: input.dateScrutin } });
      return s;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw Errors.conflict("Ce code de scrutin existe déjà.");
    throw e;
  }
}

/** PLANIFIE → OUVERT → CLOS. L'ouverture exige des circonscriptions rattachées et au moins une candidature recevable. */
export async function changeScrutinStatut(ctx: AuthContext, id: string, input: ScrutinActionInput) {
  assertPermission(ctx, "elections:manage");
  const s = await prisma.scrutin.findUnique({ where: { id }, select: { id: true, code: true, statut: true } });
  if (!s) throw Errors.notFound();
  const to = nextStatut(s.statut, input.action);
  if (!to) throw Errors.conflict(`Action impossible : le scrutin est « ${s.statut} ».`);

  if (input.action === "OUVRIR") {
    const [circ, recevables] = await Promise.all([
      prisma.scrutinCirconscription.count({ where: { scrutinId: id } }),
      prisma.candidature.count({ where: { scrutinId: id, statut: "RECEVABLE" } }),
    ]);
    if (circ === 0) throw Errors.conflict("Aucune circonscription n'est rattachée à ce scrutin.");
    if (recevables === 0) throw Errors.conflict("Aucune candidature recevable : le scrutin ne peut pas être ouvert.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.scrutin.update({ where: { id }, data: { statut: to, ...(to === "OUVERT" ? { ouvertLe: new Date() } : { closLe: new Date() }) } });
    await writeAudit(tx, ctx, { action: to === "OUVERT" ? "SCRUTIN_OUVERT" : "SCRUTIN_CLOS", entite: "Scrutin", entiteId: id, details: { code: s.code } });
  });
  return { ok: true, statut: to };
}

/** La CENI fixe le nombre de sièges de chaque circonscription pour un scrutin (et la rattache au scrutin). */
export async function setSieges(ctx: AuthContext, scrutinId: string, input: SiegesInput) {
  assertPermission(ctx, "elections:manage");
  const [s, c] = await Promise.all([
    prisma.scrutin.findUnique({ where: { id: scrutinId }, select: { id: true, code: true, type: true, statut: true } }),
    prisma.circonscription.findUnique({ where: { id: input.circonscriptionId }, select: { id: true, nom: true, actif: true } }),
  ]);
  if (!s) throw Errors.notFound();
  if (!c || !c.actif) throw Errors.validation([{ champ: "circonscriptionId", message: "Circonscription inconnue ou inactive" }]);
  if (s.statut !== "PLANIFIE") throw Errors.conflict("Les sièges ne sont modifiables que pour un scrutin planifié.");
  const legislative = isLegislative(s.type as TypeScrutin);
  if (legislative && input.sieges < 1) throw Errors.validation([{ champ: "sieges", message: "Au moins un siège pour un scrutin législatif." }]);
  if (!legislative && input.sieges !== 0) throw Errors.validation([{ champ: "sieges", message: "La présidentielle n'a pas de sièges par circonscription (0)." }]);

  await prisma.$transaction(async (tx) => {
    await tx.scrutinCirconscription.upsert({
      where: { scrutinId_circonscriptionId: { scrutinId, circonscriptionId: c.id } },
      create: { scrutinId, circonscriptionId: c.id, sieges: input.sieges },
      update: { sieges: input.sieges },
    });
    await writeAudit(tx, ctx, { action: "SIEGES_DEFINIS", entite: "Scrutin", entiteId: scrutinId, details: { scrutin: s.code, circonscription: c.nom, sieges: input.sieges } });
  });
  return { ok: true };
}

// ───────────────────────── Circonscriptions ─────────────────────────

export async function listCirconscriptions(ctx: AuthContext) {
  assertPermission(ctx, "elections:read");
  const own = ownCirconscription(ctx);
  return prisma.circonscription.findMany({
    where: own ? { id: own } : {},
    select: { id: true, code: true, nom: true, actif: true, province: { select: { id: true, nom: true } }, commune: { select: { nom: true } } },
    orderBy: [{ province: { code: "asc" } }, { code: "asc" }],
    take: 1000,
  });
}

/** La CENI couvre TOUTES les provinces de la RDC : le périmètre national doit inclure la province visée. */
export async function createCirconscription(ctx: AuthContext, input: CreateCirconscriptionInput) {
  assertPermission(ctx, "elections:manage");
  if (!scopeIncludes(ctx.scope, { provinceId: input.provinceId })) throw Errors.forbidden("Province hors de votre périmètre.");
  const p = await prisma.province.findUnique({ where: { id: input.provinceId }, select: { id: true } });
  if (!p) throw Errors.validation([{ champ: "provinceId", message: "Province inconnue" }]);
  if (input.communeId) {
    const k = await prisma.commune.findFirst({ where: { id: input.communeId, provinceId: p.id }, select: { id: true } });
    if (!k) throw Errors.validation([{ champ: "communeId", message: "Cette commune / ce territoire n'appartient pas à la province" }]);
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const c = await tx.circonscription.create({
        data: { provinceId: p.id, communeId: input.communeId ?? null, code: input.code, nom: input.nom, creePar: ctx.user.id },
        select: { id: true, nom: true },
      });
      await writeAudit(tx, ctx, { action: "CIRCONSCRIPTION_CREEE", entite: "Circonscription", entiteId: c.id, details: { nom: c.nom, provinceId: p.id } });
      return c;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw Errors.conflict("Code ou nom de circonscription déjà utilisé dans cette province.");
    throw e;
  }
}

// ───────────────────────── Espace électeur (public) ─────────────────────────

/** Scrutins ouverts. Liste vide = espace électeur INVISIBLE (404 côté pages). Aucune authentification. */
export async function getOpenScrutins() {
  const rows = await prisma.scrutin.findMany({
    where: { statut: "OUVERT" },
    orderBy: { dateScrutin: "asc" },
    select: { id: true, code: true, libelle: true, type: true, statut: true, dateScrutin: true },
  });
  return isElectorSpaceVisible(rows) ? rows : [];
}

export async function isElectorSpaceOpen(): Promise<boolean> {
  return (await getOpenScrutins()).length > 0;
}

/** Contrôle d'inscription d'un électeur par NIU : réponse minimale (initiales), jamais de données personnelles. */
export async function checkElector(niu: string) {
  const open = await getOpenScrutins();
  if (open.length === 0) throw new AppError(404, "NOT_FOUND", "Aucun scrutin ouvert.");
  const c = await prisma.citoyen.findUnique({
    where: { niu },
    select: { nom: true, prenom: true, dateNaissance: true, statut: true, provinceId: true, communeId: true, province: { select: { nom: true } }, commune: { select: { nom: true } } },
  });
  if (!c) return { trouve: false as const };
  const naissance = toIso(c.dateNaissance);
  const circ = await prisma.scrutinCirconscription.findMany({
    where: {
      scrutinId: { in: open.map((o) => o.id) },
      circonscription: { actif: true, provinceId: c.provinceId, OR: [{ communeId: null }, { communeId: c.communeId }] },
    },
    select: { scrutinId: true, circonscription: { select: { nom: true } } },
  });
  return {
    trouve: true as const,
    initiales: `${c.prenom.charAt(0)}${c.nom.charAt(0)}`.toUpperCase(),
    province: c.province.nom,
    commune: c.commune.nom,
    scrutins: open.map((o) => {
      let eligible = true;
      let raison: string | null = null;
      if (c.statut === "DECEDE") { eligible = false; raison = "Dossier clos (décès déclaré)."; }
      else if (!voterAgeOk(naissance, toIso(o.dateScrutin))) { eligible = false; raison = "Âge minimum de 18 ans non atteint à la date du scrutin."; }
      return {
        code: o.code, libelle: o.libelle, type: o.type, dateScrutin: toIso(o.dateScrutin), eligible, raison,
        circonscriptions: eligible ? [...new Set(circ.filter((x) => x.scrutinId === o.id).map((x) => x.circonscription.nom))] : [],
      };
    }),
  };
}
