import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { assertPermission } from "@/server/policies/guards";
import type { AuthContext } from "@/types/auth";

export type GeoLevel = "provinces" | "communes" | "quartiers" | "rues";

/**
 * Navigation hiérarchique limitée au périmètre : un utilisateur ne liste que sa province, sa commune, son quartier
 * ou sa rue — et leurs descendants. Le périmètre porte toute la chaîne d'ancêtres.
 */
export async function listGeography(ctx: AuthContext, level: GeoLevel, parentId?: string) {
  assertPermission(ctx, "geography:read");
  const s = ctx.scope;
  if (level === "provinces") {
    return prisma.province.findMany({
      where: s.provinceId ? { id: s.provinceId } : {},
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true, chefLieu: true, statut: true },
    });
  }
  if (!parentId) throw Errors.badRequest("Paramètre parentId requis.");
  if (level === "communes") {
    if (s.provinceId && s.provinceId !== parentId) return [];
    return prisma.commune.findMany({
      where: { provinceId: parentId, ...(s.communeId ? { id: s.communeId } : {}) },
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true, ville: true, kind: true },
    });
  }
  if (level === "quartiers") {
    if (s.communeId && s.communeId !== parentId) return [];
    return prisma.quartier.findMany({
      where: { communeId: parentId, ...(s.quartierId ? { id: s.quartierId } : {}) },
      orderBy: { code: "asc" },
      select: { id: true, code: true, nom: true, kind: true },
    });
  }
  if (s.quartierId && s.quartierId !== parentId) return [];
  return prisma.rue.findMany({
    where: { quartierId: parentId, ...(s.rueId ? { id: s.rueId } : {}) },
    orderBy: { code: "asc" },
    select: { id: true, code: true, nom: true },
  });
}

/** Provinces et volume de communes/territoires (ADMIN, AUDITEUR, GOUVERNEUR : limité à sa province). */
export async function provinceOverview(ctx: AuthContext) {
  assertPermission(ctx, "geography:read");
  return prisma.province.findMany({
    where: ctx.scope.provinceId ? { id: ctx.scope.provinceId } : {},
    orderBy: { code: "asc" },
    select: { id: true, code: true, nom: true, chefLieu: true, statut: true, _count: { select: { communes: true } } },
  });
}

/** Libellé lisible du périmètre : « Kinshasa › Limete › Quartier › Rue ». */
export async function describeScope(ctx: AuthContext): Promise<string> {
  const s = ctx.scope;
  if (s.level === "NATIONAL") return "National";
  const [p, c, q, r] = await Promise.all([
    s.provinceId ? prisma.province.findUnique({ where: { id: s.provinceId }, select: { nom: true } }) : null,
    s.communeId ? prisma.commune.findUnique({ where: { id: s.communeId }, select: { nom: true } }) : null,
    s.quartierId ? prisma.quartier.findUnique({ where: { id: s.quartierId }, select: { nom: true } }) : null,
    s.rueId ? prisma.rue.findUnique({ where: { id: s.rueId }, select: { nom: true } }) : null,
  ]);
  return [p?.nom, c?.nom, q?.nom, r?.nom].filter(Boolean).join(" › ");
}
