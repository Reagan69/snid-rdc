import { z } from "zod";
import { niuField, pastDate, personSchema } from "@/modules/citizens/schemas/person.schema";

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const createDeclarationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("IDENTIFICATION"), personne: personSchema, confirmerDoublon: z.boolean().optional() }),
  z.object({ type: z.literal("NAISSANCE"), personne: personSchema, confirmerDoublon: z.boolean().optional() }),
  z.object({ type: z.literal("DECES"), niu: niuField, dateDeces: pastDate, cause: text(0, 120).optional() }),
  z.object({ type: z.literal("DEPART"), niu: niuField, destination: text(2, 120), dateDepart: pastDate }),
  z.object({ type: z.literal("ARRIVEE"), niu: niuField, provenance: text(2, 120), dateArrivee: pastDate }),
]);
export type CreateDeclarationInput = z.infer<typeof createDeclarationSchema>;

export const decisionSchema = z
  .object({ decision: z.enum(["APPROUVEE", "REJETEE"]), motif: text(0, 300).optional() })
  .refine((d) => d.decision !== "REJETEE" || (d.motif?.length ?? 0) >= 5, {
    message: "Motif obligatoire (5 caractères minimum) pour un rejet",
    path: ["motif"],
  });
export type DecisionInput = z.infer<typeof decisionSchema>;

export const listDeclarationsQuery = z.object({
  statut: z.enum(["EN_ATTENTE", "VALIDEE", "REJETEE"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type ListDeclarationsQuery = z.infer<typeof listDeclarationsQuery>;

// Contenus relus depuis la base au moment de la validation (aucune confiance dans le JSON stocké).
export const identificationData = z.object({ personne: personSchema });
export const decesData = z.object({ niu: niuField, dateDeces: pastDate });
export const arriveeData = z.object({ niu: niuField, dateArrivee: pastDate });
