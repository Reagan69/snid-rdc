import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/policies/guards";
import { Errors } from "@/lib/errors";
import { scopeIncludes } from "@/modules/geography/scope";
import { getHierarchyByRue } from "@/modules/geography/repositories/geography.repository";
import { auditBestEffort } from "@/modules/audit/services/audit.service";
import { formatNiu, isValidNiu, niuPrefix, normalizeNiu, type NiuCodes } from "@/modules/niu/niu";
import type { AuthContext } from "@/types/auth";

/**
 * Attribue le prochain NIU d'un préfixe, de façon ATOMIQUE : l'UPSERT avec incrément verrouille la ligne du compteur
 * jusqu'à la fin de la transaction, donc deux validations simultanées ne peuvent jamais obtenir le même numéro.
 * La contrainte UNIQUE de Citoyen.niu constitue un second garde-fou.
 */
export async function allocateNiu(tx: Prisma.TransactionClient, codes: NiuCodes): Promise<string> {
  const prefix = niuPrefix(codes);
  const row = await tx.niuSequence.upsert({
    where: { prefixe: prefix },
    create: { prefixe: prefix, dernier: 1 },
    update: { dernier: { increment: 1 } },
    select: { dernier: true },
  });
  return formatNiu(prefix, row.dernier);
}

/** Numéro de document séquentiel par année (DCL-2026-000012, CNI-2026-000004, CAN-2026-000007), même mécanisme atomique. */
export async function allocateNumber(tx: Prisma.TransactionClient, kind: "DCL" | "CNI" | "CAN"): Promise<string> {
  const prefixe = `${kind}-${new Date().getUTCFullYear()}`;
  const row = await tx.niuSequence.upsert({
    where: { prefixe },
    create: { prefixe, dernier: 1 },
    update: { dernier: { increment: 1 } },
    select: { dernier: true },
  });
  return `${prefixe}-${String(row.dernier).padStart(6, "0")}`;
}

/** Aperçu du prochain NIU d'une rue du périmètre. NON réservé : l'attribution réelle a lieu à la validation. */
export async function previewNextNiu(ctx: AuthContext, rueId: string) {
  assertPermission(ctx, "citizens:create");
  const h = await getHierarchyByRue(prisma, rueId);
  if (!h || !scopeIncludes(ctx.scope, h)) throw Errors.notFound();
  const prefix = niuPrefix(h.codes);
  const row = await prisma.niuSequence.findUnique({ where: { prefixe: prefix }, select: { dernier: true } });
  return { prefixe: prefix, prochain: formatNiu(prefix, (row?.dernier ?? 0) + 1), reserve: false };
}

/** Vérifie un NIU. Hors périmètre : on confirme seulement le format, jamais l'existence (pas d'énumération). */
export async function verifyNiu(ctx: AuthContext, raw: string) {
  assertPermission(ctx, "niu:verify");
  const niu = normalizeNiu(raw);
  if (!isValidNiu(niu)) return { niu, formatValide: false as const };
  const c = await prisma.citoyen.findUnique({
    where: { niu },
    select: { statut: true, provinceId: true, communeId: true, quartierId: true, rueId: true, nom: true, prenom: true, commune: { select: { nom: true } } },
  });
  await auditBestEffort(ctx, { action: "NIU_VERIFIE", entite: "Citoyen", details: { niu, trouve: !!c } });
  if (!c || !scopeIncludes(ctx.scope, c)) return { niu, formatValide: true as const, visible: false as const };
  return {
    niu,
    formatValide: true as const,
    visible: true as const,
    existe: true as const,
    statut: c.statut,
    commune: c.commune.nom,
    initiales: `${c.prenom.charAt(0)}${c.nom.charAt(0)}`.toUpperCase(),
  };
}
