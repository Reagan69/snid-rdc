// Chaîne de validation d'une déclaration : chef de quartier → chef de bureau → bourgmestre → administrateur ONIP.
// Un niveau sans titulaire actif dans le périmètre est ignoré (comme dans la démonstration). Logique pure.
import type { RoleCode } from "../roles/permissions.ts";

export const APPROVAL_CHAIN: readonly RoleCode[] = ["CHEF_QUARTIER", "CHEF_BUREAU", "BOURGMESTRE", "ADMIN"];

/**
 * Prochain rôle devant décider, ou null si la chaîne est complète.
 * @param activeRoles rôles ayant un titulaire actif couvrant la déclaration
 * @param approved    rôles ayant déjà approuvé
 */
export function nextRequiredRole(activeRoles: Iterable<RoleCode>, approved: Iterable<RoleCode>): RoleCode | null {
  const active = new Set(activeRoles);
  const done = new Set(approved);
  for (const role of APPROVAL_CHAIN) {
    if (active.has(role) && !done.has(role)) return role;
  }
  return null;
}

export function canDecide(role: RoleCode, activeRoles: Iterable<RoleCode>, approved: Iterable<RoleCode>): boolean {
  return nextRequiredRole(activeRoles, approved) === role;
}

export function isChainComplete(activeRoles: Iterable<RoleCode>, approved: Iterable<RoleCode>): boolean {
  return nextRequiredRole(activeRoles, approved) === null;
}
