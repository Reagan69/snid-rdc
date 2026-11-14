import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { AppError, Errors } from "@/lib/errors";
import { assertPermission } from "@/server/policies/guards";
import { scopeIncludes } from "@/modules/geography/scope";
import { writeAudit } from "@/modules/audit/services/audit.service";
import type { AuthContext } from "@/types/auth";

/**
 * Capture biométrique SIMULÉE (démonstration). Elle ne stocke AUCUNE donnée biométrique : seulement un statut.
 * La biométrie réelle exige un équipement certifié, un fondement légal, un chiffrement dédié et une validation
 * de sécurité : tant que ce n'est pas le cas, le mode REEL est refusé.
 */
export async function captureBiometrics(ctx: AuthContext, citoyenId: string, mode: "SIMULATION" | "REEL" = "SIMULATION") {
  assertPermission(ctx, "biometrics:capture");
  if (mode === "REEL") {
    if (env().BIOMETRICS_REAL_ENABLED !== "true") throw Errors.forbidden("La biométrie réelle n'est pas activée dans cet environnement.");
    throw new AppError(501, "NOT_IMPLEMENTED", "Aucun équipement biométrique certifié n'est intégré.");
  }
  const c = await prisma.citoyen.findUnique({ where: { id: citoyenId }, select: { niu: true, provinceId: true, communeId: true, quartierId: true, rueId: true } });
  if (!c || !scopeIncludes(ctx.scope, c)) throw Errors.notFound();
  return prisma.$transaction(async (tx) => {
    const data = { mode: "SIMULATION" as const, statut: "COMPLET" as const, qualite: 70 + Math.floor(Math.random() * 30), dateCapture: new Date() };
    const d = await tx.dossierBiometrique.upsert({ where: { citoyenId }, create: { citoyenId, ...data }, update: data, select: { statut: true, mode: true, qualite: true } });
    await writeAudit(tx, ctx, { action: "BIOMETRIE_SIMULEE", entite: "Citoyen", entiteId: citoyenId, details: { niu: c.niu } });
    return d;
  });
}
