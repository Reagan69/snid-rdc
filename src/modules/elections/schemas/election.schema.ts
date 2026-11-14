import { z } from "zod";
import { isoDate, niuField } from "@/modules/citizens/schemas/person.schema";
import { TYPES_SCRUTIN } from "@/modules/elections/rules";

const uuid = z.string().uuid();
const count = z.number().int().min(0).max(100_000_000);

export const createScrutinSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{2,29}$/, "Code : 3 à 30 caractères (A-Z, 0-9, -)"),
  libelle: z.string().trim().min(5, "Libellé : 5 caractères minimum").max(120),
  type: z.enum(TYPES_SCRUTIN),
  dateScrutin: isoDate,
});
export type CreateScrutinInput = z.infer<typeof createScrutinSchema>;

export const scrutinActionSchema = z.object({ action: z.enum(["OUVRIR", "CLORE"]) });
export type ScrutinActionInput = z.infer<typeof scrutinActionSchema>;

export const createCirconscriptionSchema = z.object({
  provinceId: uuid,
  communeId: uuid.optional(),
  code: z.number().int().min(1).max(999),
  nom: z.string().trim().min(3, "Nom : 3 caractères minimum").max(80),
});
export type CreateCirconscriptionInput = z.infer<typeof createCirconscriptionSchema>;

export const siegesSchema = z.object({ circonscriptionId: uuid, sieges: z.number().int().min(0).max(500) });
export type SiegesInput = z.infer<typeof siegesSchema>;

export const createCandidatureSchema = z.object({
  scrutinId: uuid,
  niu: niuField,
  circonscriptionId: uuid.optional(),
  parti: z.string().trim().min(2).max(80).optional(),
});
export type CreateCandidatureInput = z.infer<typeof createCandidatureSchema>;

export const decideCandidatureSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("RECEVABLE") }),
  z.object({ decision: z.literal("REJETEE"), motif: z.string().trim().min(5, "Motif obligatoire").max(300) }),
]);
export type DecideCandidatureInput = z.infer<typeof decideCandidatureSchema>;

export const listCandidaturesQuery = z.object({
  scrutinId: uuid.optional(),
  circonscriptionId: uuid.optional(),
  statut: z.enum(["RECUE", "RECEVABLE", "REJETEE"]).optional(),
});
export type ListCandidaturesQuery = z.infer<typeof listCandidaturesQuery>;

export const saisieResultatsSchema = z
  .object({
    inscrits: count,
    votants: count,
    nuls: count,
    voix: z.array(z.object({ candidatureId: uuid, voix: count })).max(500),
  })
  .refine((v) => new Set(v.voix.map((x) => x.candidatureId)).size === v.voix.length, "Candidat en double dans la saisie.");
export type SaisieResultatsInput = z.infer<typeof saisieResultatsSchema>;

export const publierResultatsSchema = z.object({ circonscriptionId: uuid });
export type PublierResultatsInput = z.infer<typeof publierResultatsSchema>;

export const verifierElecteurSchema = z.object({ niu: niuField });
