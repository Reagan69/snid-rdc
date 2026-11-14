import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { assertPermission } from "@/server/policies/guards";
import { auditBestEffort, writeAudit } from "@/modules/audit/services/audit.service";
import { ownCirconscription } from "@/modules/elections/services/election.service";
import {
  isLegislative, rankResults, resultsVisibleToCandidate, validateResultTotals, type StatutScrutin, type TypeScrutin,
} from "@/modules/elections/rules";
import type { PublierResultatsInput, SaisieResultatsInput } from "@/modules/elections/schemas/election.schema";
import type { AuthContext } from "@/types/auth";

/** Tableaux de résultats par circonscription (candidats classés par voix). */
async function loadTables(scrutinId: string, opts: { onlyPublished: boolean; circonscriptionId?: string }) {
  const rows = await prisma.scrutinCirconscription.findMany({
    where: { scrutinId, ...(opts.onlyPublished ? { publie: true } : {}), ...(opts.circonscriptionId ? { circonscriptionId: opts.circonscriptionId } : {}) },
    select: {
      circonscriptionId: true, sieges: true, inscrits: true, votants: true, nuls: true, saisiLe: true, publie: true, publieLe: true,
      circonscription: { select: { nom: true, code: true, province: { select: { nom: true } } } },
    },
    orderBy: { circonscription: { nom: "asc" } },
  });
  if (rows.length === 0) return [];
  const voix = await prisma.resultatCandidat.findMany({
    where: { scrutinId, circonscriptionId: { in: rows.map((r) => r.circonscriptionId) } },
    select: { circonscriptionId: true, voix: true, candidature: { select: { id: true, parti: true, citoyen: { select: { nom: true, postnom: true, prenom: true } } } } },
  });
  return rows.map((r) => ({
    circonscriptionId: r.circonscriptionId,
    circonscription: r.circonscription.nom,
    province: r.circonscription.province.nom,
    sieges: r.sieges,
    inscrits: r.inscrits,
    votants: r.votants,
    nuls: r.nuls,
    saisi: r.saisiLe !== null,
    publie: r.publie,
    publieLe: r.publieLe,
    resultats: rankResults(
      voix.filter((v) => v.circonscriptionId === r.circonscriptionId).map((v) => ({
        candidatureId: v.candidature.id,
        candidat: `${v.candidature.citoyen.prenom} ${v.candidature.citoyen.nom} ${v.candidature.citoyen.postnom}`,
        parti: v.candidature.parti,
        voix: v.voix,
      })),
    ),
  }));
}

/** Personnel électoral : résultats du périmètre (une circonscription ne voit que la sienne). */
export async function getResultats(ctx: AuthContext, scrutinId: string) {
  assertPermission(ctx, "results:read");
  const own = ownCirconscription(ctx);
  const scrutin = await prisma.scrutin.findUnique({ where: { id: scrutinId }, select: { id: true, code: true, libelle: true, type: true, statut: true } });
  if (!scrutin) throw Errors.notFound();
  return { scrutin, circonscriptions: await loadTables(scrutinId, { onlyPublished: false, circonscriptionId: own ?? undefined }) };
}

/** Candidats attendus dans une circonscription : présidentielle = tous les recevables ; législative = ceux de la circonscription. */
async function candidatesToScore(scrutinId: string, type: TypeScrutin, circonscriptionId: string) {
  return prisma.candidature.findMany({
    where: { scrutinId, statut: "RECEVABLE", ...(isLegislative(type) ? { circonscriptionId } : {}) },
    select: { id: true, numero: true, parti: true, citoyen: { select: { nom: true, postnom: true, prenom: true } } },
    orderBy: { numero: "asc" },
  });
}

/** Données du formulaire de saisie : candidats attendus dans SA circonscription et saisie existante. */
export async function getSaisieContext(ctx: AuthContext, scrutinId: string) {
  assertPermission(ctx, "results:enter");
  const circonscriptionId = ownCirconscription(ctx);
  if (!circonscriptionId) throw Errors.forbidden("Seul un agent de circonscription saisit les résultats.");
  const scrutin = await prisma.scrutin.findUnique({ where: { id: scrutinId }, select: { id: true, type: true } });
  if (!scrutin) throw Errors.notFound();
  const part = await prisma.scrutinCirconscription.findUnique({
    where: { scrutinId_circonscriptionId: { scrutinId, circonscriptionId } },
    select: { inscrits: true, votants: true, nuls: true, saisiLe: true, publie: true },
  });
  if (!part) return null;
  const [attendus, voix] = await Promise.all([
    candidatesToScore(scrutinId, scrutin.type as TypeScrutin, circonscriptionId),
    prisma.resultatCandidat.findMany({ where: { scrutinId, circonscriptionId }, select: { candidatureId: true, voix: true } }),
  ]);
  return {
    publie: part.publie,
    attendus: attendus.map((a) => ({ id: a.id, label: `${a.citoyen.prenom} ${a.citoyen.nom} ${a.citoyen.postnom}${a.parti ? ` (${a.parti})` : ""}` })),
    initial: part.saisiLe
      ? { inscrits: part.inscrits ?? 0, votants: part.votants ?? 0, nuls: part.nuls ?? 0, voix: Object.fromEntries(voix.map((v) => [v.candidatureId, v.voix])) as Record<string, number> }
      : null,
  };
}

/** Saisie des résultats de SA circonscription, après la clôture du scrutin, tant qu'ils ne sont pas publiés. */
export async function saisirResultats(ctx: AuthContext, scrutinId: string, input: SaisieResultatsInput) {
  assertPermission(ctx, "results:enter");
  const circonscriptionId = ownCirconscription(ctx);
  if (!circonscriptionId) throw Errors.forbidden("Seul un agent de circonscription saisit les résultats.");
  const scrutin = await prisma.scrutin.findUnique({ where: { id: scrutinId }, select: { id: true, code: true, type: true, statut: true } });
  if (!scrutin) throw Errors.notFound();
  if (scrutin.statut !== "CLOS") throw Errors.conflict("La saisie n'est possible qu'après la clôture du scrutin.");
  const part = await prisma.scrutinCirconscription.findUnique({
    where: { scrutinId_circonscriptionId: { scrutinId, circonscriptionId } }, select: { publie: true },
  });
  if (!part) throw Errors.notFound("Votre circonscription ne participe pas à ce scrutin.");
  if (part.publie) throw Errors.conflict("Résultats déjà publiés par la CENI : saisie verrouillée.");

  const attendus = await candidatesToScore(scrutinId, scrutin.type as TypeScrutin, circonscriptionId);
  const ids = new Set(attendus.map((a) => a.id));
  const inconnus = input.voix.filter((v) => !ids.has(v.candidatureId));
  if (inconnus.length > 0) throw Errors.validation([{ champ: "voix", message: "Candidat non recevable ou hors de cette circonscription." }]);
  const parId = new Map(input.voix.map((v) => [v.candidatureId, v.voix]));
  const lignes = attendus.map((a) => ({ candidatureId: a.id, voix: parId.get(a.id) ?? 0 }));
  const err = validateResultTotals({ inscrits: input.inscrits, votants: input.votants, nuls: input.nuls, voix: lignes.map((l) => l.voix) });
  if (err) throw Errors.validation([{ champ: "totaux", message: err }]);

  await prisma.$transaction(async (tx) => {
    await tx.resultatCandidat.deleteMany({ where: { scrutinId, circonscriptionId } });
    await tx.resultatCandidat.createMany({ data: lignes.map((l) => ({ scrutinId, circonscriptionId, candidatureId: l.candidatureId, voix: l.voix })) });
    await tx.scrutinCirconscription.update({
      where: { scrutinId_circonscriptionId: { scrutinId, circonscriptionId } },
      data: { inscrits: input.inscrits, votants: input.votants, nuls: input.nuls, saisiPar: ctx.user.id, saisiLe: new Date() },
    });
    await writeAudit(tx, ctx, {
      action: "RESULTATS_SAISIS", entite: "Scrutin", entiteId: scrutinId,
      details: { scrutin: scrutin.code, circonscriptionId, inscrits: input.inscrits, votants: input.votants, nuls: input.nuls },
    });
  });
  return { ok: true };
}

/** La CENI publie les résultats d'une circonscription : ils deviennent affichés au public et consultables par les candidats. */
export async function publierResultats(ctx: AuthContext, scrutinId: string, input: PublierResultatsInput) {
  assertPermission(ctx, "elections:manage");
  const scrutin = await prisma.scrutin.findUnique({ where: { id: scrutinId }, select: { id: true, code: true, statut: true } });
  if (!scrutin) throw Errors.notFound();
  if (scrutin.statut !== "CLOS") throw Errors.conflict("Les résultats ne se publient qu'après la clôture du scrutin.");
  const part = await prisma.scrutinCirconscription.findUnique({
    where: { scrutinId_circonscriptionId: { scrutinId, circonscriptionId: input.circonscriptionId } }, select: { saisiLe: true, publie: true },
  });
  if (!part) throw Errors.notFound();
  if (!part.saisiLe) throw Errors.conflict("Les résultats de cette circonscription n'ont pas encore été saisis.");
  if (part.publie) throw Errors.conflict("Résultats déjà publiés.");
  await prisma.$transaction(async (tx) => {
    await tx.scrutinCirconscription.update({
      where: { scrutinId_circonscriptionId: { scrutinId, circonscriptionId: input.circonscriptionId } },
      data: { publie: true, publieLe: new Date(), publiePar: ctx.user.id },
    });
    await writeAudit(tx, ctx, { action: "RESULTATS_PUBLIES", entite: "Scrutin", entiteId: scrutinId, details: { scrutin: scrutin.code, circonscriptionId: input.circonscriptionId } });
  });
  return { ok: true };
}

/** Public : résultats PUBLIÉS, affichés par circonscription, pour les scrutins clos. */
export async function getPublishedResults() {
  const scrutins = await prisma.scrutin.findMany({
    where: { statut: "CLOS", circonscriptions: { some: { publie: true } } },
    orderBy: { dateScrutin: "desc" },
    take: 20,
    select: { id: true, code: true, libelle: true, type: true, statut: true, dateScrutin: true },
  });
  return Promise.all(scrutins.map(async (s) => ({ scrutin: s, circonscriptions: await loadTables(s.id, { onlyPublished: true }) })));
}

/**
 * Candidat : consulte ses résultats APRÈS le vote (scrutin clos) et une fois publiés. Présidentielle : toutes les
 * circonscriptions publiées ; législative : sa circonscription.
 */
export async function getMyResults(ctx: AuthContext) {
  assertPermission(ctx, "results:own");
  const cand = await prisma.candidature.findUnique({
    where: { userId: ctx.user.id },
    select: {
      id: true, numero: true, circonscriptionId: true,
      scrutin: { select: { id: true, code: true, libelle: true, type: true, statut: true } },
    },
  });
  if (!cand) throw Errors.notFound("Aucune candidature rattachée à ce compte.");
  const statut = cand.scrutin.statut as StatutScrutin;
  const base = { candidature: { id: cand.id, numero: cand.numero }, scrutin: cand.scrutin };
  if (statut !== "CLOS") return { ...base, disponible: false as const, circonscriptions: [] };
  const tables = (await loadTables(cand.scrutin.id, { onlyPublished: true, circonscriptionId: cand.circonscriptionId ?? undefined }))
    .filter((t) => resultsVisibleToCandidate(statut, t.publie));
  await auditBestEffort(ctx, { action: "RESULTATS_CONSULTES_CANDIDAT", entite: "Candidature", entiteId: cand.id });
  return { ...base, disponible: tables.length > 0, circonscriptions: tables };
}
