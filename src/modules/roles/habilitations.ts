// Habilitations d'un rôle, en français courant. Calculées à partir des permissions réelles : elles ne peuvent pas diverger du contrôle d'accès.
import { MANAGEABLE_ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type Permission, type RoleCode } from "./permissions.ts";

const LABELS: Partial<Record<Permission, string>> = {
  "niu:verify": "Vérifier l'authenticité d'un NIU : validité, initiales, commune et statut seulement",
  "citizens:read": "Consulter les dossiers des citoyens",
  "cards:read": "Consulter les cartes d'identité",
  "geography:read": "Consulter l'administration territoriale",
  "elections:read": "Consulter les scrutins, circonscriptions et sièges",
  "elections:manage": "Créer les scrutins et circonscriptions, fixer les sièges, ouvrir et clore les scrutins, publier les résultats",
  "candidatures:read": "Consulter les candidatures",
  "candidatures:create": "Enregistrer des candidatures",
  "results:read": "Consulter les résultats",
};

export function describeHabilitations(role: RoleCode): string[] {
  const perms = ROLE_PERMISSIONS[role];
  const out = perms.filter((p) => LABELS[p]).map((p) => LABELS[p] as string);
  if (perms.includes("users:create") && MANAGEABLE_ROLES[role].length > 0) {
    out.push(`Créer et gérer les comptes : ${MANAGEABLE_ROLES[role].map((r) => ROLE_LABELS[r]).join(" ; ")}`);
  }
  return out;
}
