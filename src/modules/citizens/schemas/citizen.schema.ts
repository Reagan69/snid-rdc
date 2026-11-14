import { z } from "zod";
import { pastDate } from "./person.schema";

export const listCitizensQuery = z.object({
  q: z.string().trim().max(80).optional(),
  statut: z.enum(["RESIDENT", "EN_DEPLACEMENT", "DECEDE"]).optional(),
  communeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type ListCitizensQuery = z.infer<typeof listCitizensQuery>;

// Correction d'un dossier : motif obligatoire, ancien et nouveau contenu journalisés.
export const updateCitizenSchema = z
  .object({
    nom: z.string().trim().min(1).max(60).optional(),
    postnom: z.string().trim().min(1).max(60).optional(),
    prenom: z.string().trim().min(1).max(60).optional(),
    dateNaissance: pastDate.optional(),
    sexe: z.enum(["M", "F"]).optional(),
    lieuNaissance: z.string().trim().max(80).optional(),
    adresse: z.string().trim().max(160).optional(),
    motif: z.string().trim().min(5, "Motif obligatoire (5 caractères minimum)").max(300),
  })
  .refine((d) => Object.keys(d).some((k) => k !== "motif"), { message: "Aucune modification fournie" });
export type UpdateCitizenInput = z.infer<typeof updateCitizenSchema>;
