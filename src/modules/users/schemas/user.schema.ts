import { z } from "zod";
import { ROLE_CODES } from "@/modules/roles/permissions";
import { isoDate } from "@/modules/citizens/schemas/person.schema";

const uuid = z.string().uuid();
const phone = z.string().trim().regex(/^[+0-9 ().-]{6,30}$/, "Téléphone invalide");

export const createUserSchema = z.object({
  nomComplet: z.string().trim().min(3, "Nom complet : 3 caractères minimum").max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,39}$/, "Identifiant : 3 à 40 caractères (a-z, 0-9, . _ -)"),
  roleCode: z.enum(ROLE_CODES),
  // Facultatif : un mot de passe initial robuste est généré sinon (affiché UNE seule fois).
  password: z.string().max(128).optional(),
  provinceId: uuid.optional(),
  communeId: uuid.optional(),
  quartierId: uuid.optional(),
  rueId: uuid.optional(),
  rueNom: z.string().trim().min(2).max(80).optional(),
  // Rôle CIRCONSCRIPTION : circonscription électorale rattachée au compte.
  circonscriptionId: uuid.optional(),
  telephone: phone.optional(),
  email: z.string().trim().email().max(120).optional(),
  dateDebutFonction: isoDate.optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SUSPENDRE"), motif: z.string().trim().min(5, "Motif obligatoire").max(300) }),
  z.object({ action: z.literal("REACTIVER") }),
  z.object({
    action: z.literal("MODIFIER"),
    nomComplet: z.string().trim().min(3).max(80).optional(),
    telephone: phone.optional(),
    email: z.string().trim().email().max(120).optional(),
    dateDebutFonction: isoDate.optional(),
  }),
  z.object({ action: z.literal("REINITIALISER_MOT_DE_PASSE") }),
  z.object({ action: z.literal("REINITIALISER_MFA") }),
]);
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
