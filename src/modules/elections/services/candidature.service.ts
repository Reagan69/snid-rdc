import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, Errors } from "@/lib/errors";
import { toIso } from "@/lib/dates";
import { hashPassword } from "@/lib/password";
import { generatePassword } from "@/lib/password-generator";
import { assertPermission } from "@/server/policies/guards";
import { writeAudit } from "@/modules/audit/services/audit.service";
import { allocateNumber } from "@/modules/niu/services/niu.service";
import { ownCirconscription } from "@/modules/elections/services/election.service";
import {
  candidateAgeIssue, canRegisterCandidature, validateCandidatureTarget, type TypeScrutin,
} from "@/modules/elections/rules";
import type {
  CreateCandidatureInput, DecideCandidatureInput, ListCandidaturesQuery,
} from "@/modules/elections/schemas/election.schema";
import type { AuthContext } from "@/types/auth";

const duplicate = () =>
  new AppError(409, "DUPLICATE_CANDIDATURE", "Ce citoyen a déjà déposé une candidature pour ce scrutin : toute candidature double est bloquée.");

export async function createCandidature(ctx: AuthContext, input: CreateCandidatureInput) {
  assertPermission(ctx, "candidatures:create");
  const scrutin = await prisma.scrutin.findUnique({ where: { id: input.scrutinId }, select: { id: true, code: true, type: true, statut: true, dateScrutin: true } });
  if (!scrutin) throw Errors.validation([{ champ: "scrutinId", message: "Scrutin inconnu" }]);
  const type = scrutin.type as TypeScrutin;

  // Présidentielle : CENI uniquement. Législatives : la circonscription concernée uniquement (jamais la CENI).
  if (!canRegisterCandidature(ctx.user.roleCode, type)) {
    throw Errors.forbidden(type === "PRESIDENTIELLE"
      ? "Les candidatures à la présidentielle sont enregistrées par la CENI, pas par les circonscriptions."
      : "Les candidatures législatives sont enregistrées au niveau local, par la circonscription concernée.");
  }
  if (scrutin.statut !== "PLANIFIE") throw Errors.conflict("Les candidatures ne sont plus reçues : le scrutin est ouvert ou clos.");

  // La circonscription d'un agent vient de SON compte, jamais du corps de la requête.
  const own = ownCirconscription(ctx);
  if (own && input.circonscriptionId && input.circonscriptionId !== own) throw Errors.notFound("Circonscription introuvable.");
  const circonscriptionId = own ?? input.circonscriptionId ?? null;
  const issue = validateCandidatureTarget(type, circonscriptionId);
  if (issue) throw Errors.validation([{ champ: "circonscriptionId", message: issue }]);

  if (circonscriptionId) {
    const part = await prisma.scrutinCirconscription.findUnique({
      where: { scrutinId_circonscriptionId: { scrutinId: scrutin.id, circonscriptionId } },
      select: { circonscription: { select: { actif: true } } },
    });
    if (!part || !part.circonscription.actif) throw Errors.conflict("Cette circonscription ne participe pas à ce scrutin (sièges non définis par la CENI).");
  }

  const c = await prisma.citoyen.findUnique({ where: { niu: input.niu }, select: { id: true, nom: true, prenom: true, dateNaissance: true, statut: true } });
  if (!c) throw Errors.validation([{ champ: "niu", message: "NIU inconnu : le candidat doit être identifié au SNID." }]);
  if (c.statut === "DECEDE") throw Errors.conflict("Ce citoyen est déclaré décédé.");
  const ageIssue = candidateAgeIssue(toIso(c.dateNaissance), type, toIso(scrutin.dateScrutin));
  if (ageIssue) throw Errors.validation([{ champ: "niu", message: ageIssue }]);

  // Blocage des candidatures doubles : contrôle explicite + contrainte unique (scrutinId, citoyenId) contre les accès concurrents.
  const deja = await prisma.candidature.findUnique({ where: { scrutinId_citoyenId: { scrutinId: scrutin.id, citoyenId: c.id } }, select: { id: true } });
  if (deja) throw duplicate();

  try {
    return await prisma.$transaction(async (tx) => {
      const numero = await allocateNumber(tx, "CAN");
      const k = await tx.candidature.create({
        data: { numero, scrutinId: scrutin.id, citoyenId: c.id, circonscriptionId, parti: input.parti ?? null, creePar: ctx.user.id },
        select: { id: true, numero: true, statut: true },
      });
      await writeAudit(tx, ctx, { action: "CANDIDATURE_ENREGISTREE", entite: "Candidature", entiteId: k.id, details: { numero: k.numero, scrutin: scrutin.code, circonscriptionId } });
      return { ...k, candidat: `${c.prenom} ${c.nom}` };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw duplicate();
    throw e;
  }
}

/**
 * Les centres de traitement et la CENI voient TOUTES les candidatures ; une circonscription ne voit que les siennes.
 * Les données du candidat se limitent à l'identité et au NIU.
 */
export async function listCandidatures(ctx: AuthContext, q: ListCandidaturesQuery) {
  assertPermission(ctx, "candidatures:read");
  const own = ownCirconscription(ctx);
  return prisma.candidature.findMany({
    where: {
      ...(q.scrutinId ? { scrutinId: q.scrutinId } : {}),
      ...(own ? { circonscriptionId: own } : q.circonscriptionId ? { circonscriptionId: q.circonscriptionId } : {}),
      ...(q.statut ? { statut: q.statut } : {}),
    },
    select: {
      id: true, numero: true, parti: true, statut: true, motifRejet: true, createdAt: true, userId: true,
      scrutin: { select: { id: true, code: true, type: true, statut: true } },
      circonscription: { select: { nom: true } },
      citoyen: { select: { niu: true, nom: true, postnom: true, prenom: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
  });
}

/** Recevabilité par le centre de traitement : possible tant que le scrutin est planifié. */
export async function decideCandidature(ctx: AuthContext, id: string, input: DecideCandidatureInput) {
  assertPermission(ctx, "candidatures:decide");
  const c = await prisma.candidature.findUnique({ where: { id }, select: { id: true, numero: true, statut: true, scrutin: { select: { statut: true } } } });
  if (!c) throw Errors.notFound();
  if (c.statut !== "RECUE") throw Errors.conflict("Cette candidature a déjà été traitée.");
  if (c.scrutin.statut !== "PLANIFIE") throw Errors.conflict("Le scrutin n'est plus en phase de recevabilité.");
  await prisma.$transaction(async (tx) => {
    await tx.candidature.update({
      where: { id },
      data: { statut: input.decision, motifRejet: input.decision === "REJETEE" ? input.motif : null, decidePar: ctx.user.id, decideLe: new Date() },
    });
    await writeAudit(tx, ctx, {
      action: input.decision === "RECEVABLE" ? "CANDIDATURE_RECEVABLE" : "CANDIDATURE_REJETEE", entite: "Candidature", entiteId: id,
      details: { numero: c.numero, ...(input.decision === "REJETEE" ? { motif: input.motif } : {}) },
    });
  });
  return { ok: true };
}

/** Compte « candidat » (consultation de ses résultats) : candidature recevable uniquement, périmètre minimal (sa rue). */
export async function createCandidateAccount(ctx: AuthContext, id: string) {
  assertPermission(ctx, "candidatures:decide");
  const c = await prisma.candidature.findUnique({
    where: { id },
    select: {
      id: true, numero: true, statut: true, userId: true,
      citoyen: { select: { nom: true, prenom: true, provinceId: true, communeId: true, quartierId: true, rueId: true } },
    },
  });
  if (!c) throw Errors.notFound();
  if (c.statut !== "RECEVABLE") throw Errors.conflict("Seule une candidature recevable peut recevoir un compte.");
  if (c.userId) throw Errors.conflict("Un compte existe déjà pour cette candidature.");

  const username = `cand.${c.numero.toLowerCase().replace(/^can-/, "").replace(/-/g, ".")}`;
  const motDePasseInitial = generatePassword();
  const passwordHash = await hashPassword(motDePasseInitial);
  const g = c.citoyen;
  await prisma.$transaction(async (tx) => {
    const u = await tx.utilisateur.create({
      data: {
        username, nomComplet: `${g.prenom} ${g.nom}`, passwordHash, roleCode: "CANDIDAT", mustChangePassword: true, creePar: ctx.user.id,
        affectation: { create: { niveau: "RUE", provinceId: g.provinceId, communeId: g.communeId, quartierId: g.quartierId, rueId: g.rueId } },
      },
      select: { id: true },
    });
    await tx.candidature.update({ where: { id }, data: { userId: u.id } });
    await writeAudit(tx, ctx, { action: "COMPTE_CANDIDAT_CREE", entite: "Candidature", entiteId: id, details: { numero: c.numero, username } });
  });
  return { username, motDePasseInitial };
}
