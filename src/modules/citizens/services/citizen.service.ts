import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";
import { assertPermission } from "@/server/policies/guards";
import { scopeIncludes, scopeWhere } from "@/modules/geography/scope";
import { auditBestEffort, writeAudit } from "@/modules/audit/services/audit.service";
import { citizenListSelect } from "@/modules/citizens/repositories/citizen.repository";
import type { ListCitizensQuery, UpdateCitizenInput } from "@/modules/citizens/schemas/citizen.schema";
import { toDate, toIso } from "@/lib/dates";
import type { AuthContext } from "@/types/auth";

export const PAGE_SIZE = 25;

export async function listCitizens(ctx: AuthContext, query: ListCitizensQuery) {
  assertPermission(ctx, "citizens:read");
  const terms = (query.q ?? "").split(/\s+/).filter(Boolean).slice(0, 4);
  const where: Prisma.CitoyenWhereInput = {
    // Le périmètre est placé EN DERNIER : il écrase tout filtre fourni par l'utilisateur.
    ...(query.communeId ? { communeId: query.communeId } : {}),
    ...(query.statut ? { statut: query.statut } : {}),
    ...scopeWhere(ctx.scope),
    AND: terms.map((t) => ({
      OR: [
        { nom: { contains: t, mode: "insensitive" as const } },
        { postnom: { contains: t, mode: "insensitive" as const } },
        { prenom: { contains: t, mode: "insensitive" as const } },
        { niu: { contains: t.toUpperCase() } },
      ],
    })),
  };
  const [total, items] = await Promise.all([
    prisma.citoyen.count({ where }),
    prisma.citoyen.findMany({
      where,
      select: citizenListSelect,
      orderBy: [{ nom: "asc" }, { postnom: "asc" }, { prenom: "asc" }],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  if (terms.length) await auditBestEffort(ctx, { action: "CITOYENS_RECHERCHE", entite: "Citoyen", details: { q: query.q ?? "", resultats: total } });
  return { items, total, page: query.page, pageSize: PAGE_SIZE };
}

/** Charge la clé géographique d'un citoyen et refuse (404 + audit) tout accès hors périmètre. */
async function loadInScope(ctx: AuthContext, id: string) {
  const geo = await prisma.citoyen.findUnique({ where: { id }, select: { provinceId: true, communeId: true, quartierId: true, rueId: true } });
  if (!geo) throw Errors.notFound();
  if (!scopeIncludes(ctx.scope, geo)) {
    await auditBestEffort(ctx, { action: "ACCES_HORS_PERIMETRE", entite: "Citoyen", entiteId: id });
    throw Errors.notFound();
  }
}

export async function getCitizen(ctx: AuthContext, id: string) {
  assertPermission(ctx, "citizens:read");
  await loadInScope(ctx, id);
  const c = await prisma.citoyen.findUniqueOrThrow({
    where: { id },
    include: {
      province: { select: { nom: true } }, commune: { select: { nom: true } },
      quartier: { select: { nom: true } }, rue: { select: { nom: true } },
      pere: { select: { niu: true, nom: true, postnom: true, prenom: true } },
      mere: { select: { niu: true, nom: true, postnom: true, prenom: true } },
      cartes: { orderBy: { createdAt: "desc" }, take: 5 },
      biometrie: { select: { mode: true, statut: true, qualite: true, dateCapture: true } },
    },
  });
  await auditBestEffort(ctx, { action: "CITOYEN_CONSULTE", entite: "Citoyen", entiteId: id, details: { niu: c.niu } });
  return c;
}

export async function updateCitizen(ctx: AuthContext, id: string, input: UpdateCitizenInput) {
  assertPermission(ctx, "citizens:update");
  await loadInScope(ctx, id);
  const { motif, ...changes } = input;
  return prisma.$transaction(async (tx) => {
    const before = await tx.citoyen.findUniqueOrThrow({ where: { id } });
    const data: Prisma.CitoyenUpdateInput = {};
    const avant: Record<string, string | null> = {};
    const apres: Record<string, string | null> = {};
    const note = (k: string, a: string | null, b: string | null) => { avant[k] = a; apres[k] = b; };
    if (changes.nom !== undefined && changes.nom.toUpperCase() !== before.nom) { data.nom = changes.nom.toUpperCase(); note("nom", before.nom, data.nom); }
    if (changes.postnom !== undefined && changes.postnom.toUpperCase() !== before.postnom) { data.postnom = changes.postnom.toUpperCase(); note("postnom", before.postnom, data.postnom); }
    if (changes.prenom !== undefined && changes.prenom !== before.prenom) { data.prenom = changes.prenom; note("prenom", before.prenom, changes.prenom); }
    if (changes.sexe !== undefined && changes.sexe !== before.sexe) { data.sexe = changes.sexe; note("sexe", before.sexe, changes.sexe); }
    if (changes.dateNaissance !== undefined && changes.dateNaissance !== toIso(before.dateNaissance)) {
      data.dateNaissance = toDate(changes.dateNaissance); note("dateNaissance", toIso(before.dateNaissance), changes.dateNaissance);
    }
    if (changes.lieuNaissance !== undefined && changes.lieuNaissance !== (before.lieuNaissance ?? "")) { data.lieuNaissance = changes.lieuNaissance; note("lieuNaissance", before.lieuNaissance, changes.lieuNaissance); }
    if (changes.adresse !== undefined && changes.adresse !== (before.adresse ?? "")) { data.adresse = changes.adresse; note("adresse", before.adresse, changes.adresse); }
    if (Object.keys(data).length === 0) throw Errors.badRequest("Aucune valeur modifiée.");
    const updated = await tx.citoyen.update({ where: { id }, data });
    await writeAudit(tx, ctx, { action: "CITOYEN_MODIFIE", entite: "Citoyen", entiteId: id, details: { niu: before.niu, motif, avant, apres } });
    return { id: updated.id, niu: updated.niu, champsModifies: Object.keys(apres) };
  });
}
