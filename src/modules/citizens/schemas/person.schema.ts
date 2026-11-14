import { z } from "zod";
import { isValidNiu, normalizeNiu } from "@/modules/niu/niu";
import { todayIso } from "@/lib/dates";

const NAME = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const name = (label: string) =>
  z.string().trim().min(1, `${label} obligatoire`).max(60, `${label} trop long`).regex(NAME, `${label} : caractères non autorisés`);
const capitalize = (v: string) => v.toLowerCase().replace(/(^|[ '-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Date invalide");

/** Date passée ou du jour, à partir de 1900. */
export const pastDate = isoDate.refine((v) => v >= "1900-01-01" && v <= todayIso(), "Date hors limites");

export const niuField = z
  .string()
  .transform(normalizeNiu)
  .refine((v) => isValidNiu(v), "NIU invalide (format CD-pp-cc-qq-rrrr-nnnnn)");

export const personSchema = z.object({
  nom: name("Nom").transform((v) => v.toUpperCase()),
  postnom: name("Postnom").transform((v) => v.toUpperCase()),
  prenom: name("Prénom").transform(capitalize),
  dateNaissance: pastDate,
  sexe: z.enum(["M", "F"]),
  lieuNaissance: z.string().trim().max(80).optional(),
  adresse: z.string().trim().max(160).optional(),
  pereNiu: niuField.optional(),
  mereNiu: niuField.optional(),
});
export type PersonInput = z.infer<typeof personSchema>;
