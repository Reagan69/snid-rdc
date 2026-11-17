// Réglages de fonctionnement : clés, valeurs par défaut et règles pures (testées sans base de données).
import type { RoleCode } from "../roles/permissions.ts";

export const DECLARATION_TYPES = ["IDENTIFICATION", "NAISSANCE", "DECES", "DEPART", "ARRIVEE"] as const;
export type DeclarationType = (typeof DECLARATION_TYPES)[number];

/** Types de déclaration que les chefs de rue peuvent valider directement, sans la chaîne hiérarchique. Défaut : aucun. */
export const KEY_VALIDATION_DIRECTE = "declarations.validationDirecte";

/** Lecture tolérante : toute valeur invalide ou inconnue est ignorée (on retombe sur le comportement strict, jamais sur le plus permissif). */
export function parseValidationDirecte(value: unknown): DeclarationType[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<string>(DECLARATION_TYPES);
  return DECLARATION_TYPES.filter((t) => value.includes(t) && known.has(t));
}

/** Une déclaration est validée directement si elle émane d'un chef de rue ET que son type est activé par l'administrateur. */
export function estValidationDirecte(role: RoleCode, type: DeclarationType, actives: readonly DeclarationType[]): boolean {
  return role === "CHEF_RUE" && actives.includes(type);
}
