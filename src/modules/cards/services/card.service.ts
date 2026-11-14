import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { Errors } from "@/lib/errors";
import { assertPermission } from "@/server/policies/guards";
import { scopeIncludes, scopeWhere } from "@/modules/geography/scope";
import { auditBestEffort, writeAudit } from "@/modules/audit/services/audit.service";
import { allocateNumber } from "@/modules/niu/services/niu.service";
import { isValidNiu, normalizeNiu } from "@/modules/niu/niu";
import { addYears, todayIso, toDate } from "@/lib/dates";
import { cardQrPayload, parseCardToken, verifySignature } from "@/lib/signing";
import type { AuthContext } from "@/types/auth";

export const CARD_VALIDITY_YEARS = 5;

export async function issueCard(ctx: AuthContext, rawNiu: string) {
  assertPermission(ctx, "cards:issue");
  const niu = normalizeNiu(rawNiu);
  if (!isValidNiu(niu)) throw Errors.validation([{ champ: "niu", message: "NIU invalide" }]);
  const c = await prisma.citoyen.findUnique({
    where: { niu },
    select: { id: true, statut: true, rueId: true, provinceId: true, communeId: true, quartierId: true },
  });
  if (!c || !scopeIncludes(ctx.scope, c)) throw Errors.notFound("Citoyen introuvable dans votre commune.");
  if (c.statut !== "RESIDENT") throw Errors.conflict("Une carte ne peut être délivrée qu'à un citoyen résident.");

  // Signataire tracé : le chef de rue actif de la rue du citoyen (s'il y en a un).
  const chefRue = await prisma.utilisateur.findFirst({
    where: { roleCode: "CHEF_RUE", actif: true, affectation: { is: { rueId: c.rueId } } },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    // Renouvellement : l'ancienne carte active est remplacée, jamais supprimée.
    await tx.carteIdentite.updateMany({ where: { citoyenId: c.id, statut: "ACTIVE" }, data: { statut: "REMPLACEE" } });
    const numero = await allocateNumber(tx, "CNI");
    const delivrance = toDate(todayIso());
    const card = await tx.carteIdentite.create({
      data: {
        numero, citoyenId: c.id, dateDelivrance: delivrance, dateExpiration: addYears(delivrance, CARD_VALIDITY_YEARS),
        emisePar: ctx.user.id, signeePar: chefRue?.id ?? null,
      },
      select: { id: true, numero: true, dateDelivrance: true, dateExpiration: true, statut: true },
    });
    await writeAudit(tx, ctx, { action: "CARTE_EMISE", entite: "CarteIdentite", entiteId: card.id, details: { numero, niu, signataire: chefRue?.id ?? null } });
    return card;
  });
}

export async function getCard(ctx: AuthContext, id: string) {
  assertPermission(ctx, "cards:read");
  const card = await prisma.carteIdentite.findUnique({
    where: { id },
    include: {
      citoyen: {
        select: {
          niu: true, nom: true, postnom: true, prenom: true, dateNaissance: true, sexe: true,
          provinceId: true, communeId: true, quartierId: true, rueId: true,
          commune: { select: { nom: true } }, quartier: { select: { nom: true } }, rue: { select: { nom: true } },
        },
      },
      signataire: { select: { nomComplet: true } },
    },
  });
  if (!card || !scopeIncludes(ctx.scope, card.citoyen)) throw Errors.notFound();
  const payload = cardQrPayload(env().APP_URL, card.citoyen.niu, env().SIGNING_SECRET);
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  await auditBestEffort(ctx, { action: "CARTE_CONSULTEE", entite: "CarteIdentite", entiteId: id });
  return { ...card, qrPayload: payload, qrDataUrl };
}

export async function listCards(ctx: AuthContext) {
  assertPermission(ctx, "cards:read");
  return prisma.carteIdentite.findMany({
    where: { citoyen: { is: scopeWhere(ctx.scope) } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, numero: true, statut: true, dateDelivrance: true, dateExpiration: true,
      citoyen: { select: { niu: true, nom: true, postnom: true, prenom: true } },
    },
  });
}

/** Vérification PUBLIQUE d'un QR : ne révèle que la validité, les initiales et la date d'expiration. */
export async function verifyCardToken(token: string) {
  const parsed = parseCardToken(decodeURIComponent(token));
  if (!parsed || !isValidNiu(parsed.niu) || !verifySignature(`card:${parsed.niu}`, parsed.signature, env().SIGNING_SECRET)) {
    return { valide: false as const, raison: "SIGNATURE_INVALIDE" as const };
  }
  const c = await prisma.citoyen.findUnique({
    where: { niu: parsed.niu },
    select: { nom: true, prenom: true, statut: true, cartes: { where: { statut: "ACTIVE" }, take: 1, select: { dateExpiration: true } } },
  });
  const carte = c?.cartes[0];
  if (!c || !carte) return { valide: false as const, raison: "AUCUNE_CARTE_ACTIVE" as const };
  if (c.statut === "DECEDE") return { valide: false as const, raison: "TITULAIRE_DECEDE" as const };
  if (carte.dateExpiration < toDate(todayIso())) return { valide: false as const, raison: "CARTE_EXPIREE" as const };
  return {
    valide: true as const,
    initiales: `${c.prenom.charAt(0)}${c.nom.charAt(0)}`.toUpperCase(),
    expiration: carte.dateExpiration.toISOString().slice(0, 10),
  };
}
