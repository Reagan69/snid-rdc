import type { Prisma, PrismaClient } from "@prisma/client";
import type { PersonInput } from "@/modules/citizens/schemas/person.schema";
import { toDate } from "@/lib/dates";

type Db = PrismaClient | Prisma.TransactionClient;

/** Homonymes parfaits (nom, postnom, prénom, sexe, date de naissance) dans TOUT le pays. */
export function findPotentialDuplicates(db: Db, p: Pick<PersonInput, "nom" | "postnom" | "prenom" | "sexe" | "dateNaissance">) {
  return db.citoyen.findMany({
    where: {
      nom: { equals: p.nom, mode: "insensitive" },
      postnom: { equals: p.postnom, mode: "insensitive" },
      prenom: { equals: p.prenom, mode: "insensitive" },
      sexe: p.sexe,
      dateNaissance: toDate(p.dateNaissance),
    },
    select: { niu: true, provinceId: true, communeId: true, quartierId: true, rueId: true },
    take: 5,
  });
}

export const citizenListSelect = {
  id: true, niu: true, nom: true, postnom: true, prenom: true, dateNaissance: true, sexe: true, statut: true,
  commune: { select: { nom: true } }, quartier: { select: { nom: true } }, rue: { select: { nom: true } },
} satisfies Prisma.CitoyenSelect;
