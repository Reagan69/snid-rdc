import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NiuCodes } from "@/modules/niu/niu";

type Db = typeof prisma | Prisma.TransactionClient;

export interface Hierarchy {
  rueId: string;
  quartierId: string;
  communeId: string;
  provinceId: string;
  codes: NiuCodes;
  noms: { rue: string; quartier: string; commune: string; province: string };
}

/** Remonte la chaîne rue → quartier → commune → province et en extrait les codes du NIU. */
export async function getHierarchyByRue(db: Db, rueId: string): Promise<Hierarchy | null> {
  const r = await db.rue.findUnique({
    where: { id: rueId },
    select: {
      id: true, code: true, nom: true,
      quartier: { select: { id: true, code: true, nom: true, commune: { select: { id: true, code: true, nom: true, province: { select: { id: true, code: true, nom: true } } } } } },
    },
  });
  if (!r) return null;
  const q = r.quartier, c = q.commune, p = c.province;
  return {
    rueId: r.id, quartierId: q.id, communeId: c.id, provinceId: p.id,
    codes: { province: p.code, commune: c.code, quartier: q.code, rue: r.code },
    noms: { rue: r.nom, quartier: q.nom, commune: c.nom, province: p.nom },
  };
}

export async function getHierarchyByQuartier(db: Db, quartierId: string) {
  const q = await db.quartier.findUnique({
    where: { id: quartierId },
    select: { id: true, commune: { select: { id: true, province: { select: { id: true } } } } },
  });
  return q ? { quartierId: q.id, communeId: q.commune.id, provinceId: q.commune.province.id } : null;
}

export async function getHierarchyByCommune(db: Db, communeId: string) {
  const c = await db.commune.findUnique({ where: { id: communeId }, select: { id: true, provinceId: true } });
  return c ? { communeId: c.id, provinceId: c.provinceId } : null;
}

/** Trouve ou crée une rue (code = max + 1 dans le quartier). La contrainte UNIQUE protège contre la concurrence. */
export async function ensureRue(db: Prisma.TransactionClient, quartierId: string, nom: string) {
  const existing = await db.rue.findUnique({ where: { quartierId_nom: { quartierId, nom } }, select: { id: true } });
  if (existing) return existing.id;
  const max = await db.rue.aggregate({ where: { quartierId }, _max: { code: true } });
  const created = await db.rue.create({ data: { quartierId, nom, code: (max._max.code ?? 0) + 1 }, select: { id: true } });
  return created.id;
}
