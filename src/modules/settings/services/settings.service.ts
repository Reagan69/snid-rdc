import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { assertPermission } from "@/server/policies/guards";
import { writeAudit } from "@/modules/audit/services/audit.service";
import { KEY_VALIDATION_DIRECTE, parseValidationDirecte, type DeclarationType } from "@/modules/settings/settings";
import type { ValidationDirecteInput } from "@/modules/settings/schemas/settings.schema";
import type { AuthContext } from "@/types/auth";

/**
 * Types validés directement. À appeler HORS transaction : en cas d'échec (table absente avant la mise à jour de la base, panne),
 * on retombe sur « aucun » = chaîne de validation complète, le comportement le plus strict.
 */
export async function getValidationDirecte(db: Prisma.TransactionClient | typeof prisma = prisma): Promise<DeclarationType[]> {
  try {
    const row = await db.parametre.findUnique({ where: { cle: KEY_VALIDATION_DIRECTE }, select: { valeur: true } });
    return parseValidationDirecte(row?.valeur);
  } catch (e) {
    logger.error("Lecture du réglage de validation directe impossible : chaîne complète appliquée", { error: String(e) });
    return [];
  }
}

export async function getSettingsOverview(ctx: AuthContext) {
  assertPermission(ctx, "settings:read");
  const [row, directes] = await Promise.all([
    prisma.parametre.findUnique({ where: { cle: KEY_VALIDATION_DIRECTE }, select: { valeur: true, modifiePar: true, updatedAt: true } }),
    // Seule la validation directe fait approuver une déclaration par un chef de rue : ce décompte est exact.
    prisma.declarationApprobation.count({ where: { roleCode: "CHEF_RUE", decision: "APPROUVEE" } }),
  ]);
  const auteur = row?.modifiePar ? await prisma.utilisateur.findUnique({ where: { id: row.modifiePar }, select: { nomComplet: true, username: true } }) : null;
  return { validationDirecte: parseValidationDirecte(row?.valeur), modifieLe: row?.updatedAt ?? null, modifiePar: auteur, nbValidationsDirectes: directes };
}

export async function updateValidationDirecte(ctx: AuthContext, input: ValidationDirecteInput) {
  assertPermission(ctx, "settings:manage");
  const apres = parseValidationDirecte(input.types);
  const avant = await getValidationDirecte();
  await prisma.$transaction(async (tx) => {
    await tx.parametre.upsert({
      where: { cle: KEY_VALIDATION_DIRECTE },
      create: { cle: KEY_VALIDATION_DIRECTE, valeur: apres, modifiePar: ctx.user.id },
      update: { valeur: apres, modifiePar: ctx.user.id },
    });
    await writeAudit(tx, ctx, { action: "REGLAGE_MODIFIE", entite: "Parametre", entiteId: KEY_VALIDATION_DIRECTE, details: { cle: KEY_VALIDATION_DIRECTE, avant, apres } });
  });
  return { ok: true, validationDirecte: apres };
}
