import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/server/policies/guards";
import { scopeWhere } from "@/modules/geography/scope";
import { can } from "@/modules/roles/permissions";
import type { AuthContext } from "@/types/auth";

/** Indicateurs de l'accueil : chaque bloc n'est calculé que si le rôle y a droit, toujours dans le périmètre. */
export async function dashboard(ctx: AuthContext) {
  const geo = scopeWhere(ctx.scope);
  const role = ctx.user.roleCode;
  const [citoyens, hommes, declarations, cartes] = await Promise.all([
    can(role, "citizens:read") ? prisma.citoyen.count({ where: geo }) : null,
    can(role, "citizens:read") ? prisma.citoyen.count({ where: { ...geo, sexe: "M" } }) : null,
    can(role, "declarations:read") ? prisma.declaration.groupBy({ by: ["statut"], where: geo, _count: { _all: true } }) : null,
    can(role, "cards:read") ? prisma.carteIdentite.count({ where: { statut: "ACTIVE", citoyen: { is: geo } } }) : null,
  ]);
  const dec = Object.fromEntries((declarations ?? []).map((d) => [d.statut, d._count._all]));
  return {
    citoyens,
    hommes,
    femmes: citoyens === null || hommes === null ? null : citoyens - hommes,
    declarationsEnAttente: declarations ? (dec.EN_ATTENTE ?? 0) : null,
    declarationsValidees: declarations ? (dec.VALIDEE ?? 0) : null,
    declarationsRejetees: declarations ? (dec.REJETEE ?? 0) : null,
    cartesActives: cartes,
  };
}

/** Population et déclarations par commune/territoire, dans le périmètre (agrégation en base, jamais en mémoire). */
export async function reportByCommune(ctx: AuthContext) {
  assertPermission(ctx, "reports:read");
  const geo = scopeWhere(ctx.scope);
  const [pop, dec] = await Promise.all([
    prisma.citoyen.groupBy({ by: ["communeId", "sexe"], where: geo, _count: { _all: true } }),
    prisma.declaration.groupBy({ by: ["communeId", "statut"], where: geo, _count: { _all: true } }),
  ]);
  const ids = [...new Set([...pop.map((p) => p.communeId), ...dec.map((d) => d.communeId)])];
  const communes = await prisma.commune.findMany({ where: { id: { in: ids } }, select: { id: true, nom: true, ville: true, province: { select: { nom: true } } } });
  return communes
    .map((c) => {
      const m = pop.find((p) => p.communeId === c.id && p.sexe === "M")?._count._all ?? 0;
      const f = pop.find((p) => p.communeId === c.id && p.sexe === "F")?._count._all ?? 0;
      const d = (s: string) => dec.find((x) => x.communeId === c.id && x.statut === s)?._count._all ?? 0;
      return { commune: c.nom, ville: c.ville, province: c.province.nom, hommes: m, femmes: f, population: m + f, enAttente: d("EN_ATTENTE"), validees: d("VALIDEE"), rejetees: d("REJETEE") };
    })
    .sort((a, b) => b.population - a.population);
}
