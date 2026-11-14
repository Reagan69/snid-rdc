// RBAC : rôles, permissions et niveau territorial attendu. Logique pure.
import type { ScopeLevel } from "../geography/scope.ts";

export const ROLE_CODES = [
  "ADMIN",
  "AUDITEUR",
  "GOUVERNEUR",
  "BOURGMESTRE",
  "CHEF_BUREAU",
  "SERVICE_COMMUNAL",
  "CHEF_QUARTIER",
  "CHEF_RUE",
  // Processus électoral
  "CENI",
  "CENTRE_TRAITEMENT",
  "CIRCONSCRIPTION",
  "CANDIDAT",
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const PERMISSIONS = [
  "citizens:read",
  "citizens:create", // dépose une demande d'identification (workflow)
  "citizens:update", // corrige un dossier (motif obligatoire, journalisé)
  "niu:verify",
  "cards:read",
  "cards:issue",
  "biometrics:read",
  "biometrics:capture",
  "declarations:read",
  "declarations:create",
  "declarations:decide",
  "users:read",
  "users:create",
  "users:update",
  "governors:read",
  "governors:manage",
  "geography:read",
  "geography:manage",
  "reports:read",
  "audit:read",
  // Processus électoral
  "elections:read", // scrutins, circonscriptions, sièges
  "elections:manage", // CENI : créer scrutins et circonscriptions, fixer les sièges, ouvrir / clore, publier
  "candidatures:read",
  "candidatures:create",
  "candidatures:decide", // centres de traitement : recevabilité des dossiers
  "results:read", // résultats du périmètre (personnel électoral)
  "results:enter", // saisie des résultats d'une circonscription
  "results:own", // un candidat consulte ses propres résultats
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: "Administrateur ONIP",
  AUDITEUR: "Auditeur",
  GOUVERNEUR: "Gouverneur de province",
  BOURGMESTRE: "Bourgmestre",
  CHEF_BUREAU: "Chef de bureau de décentralisation",
  SERVICE_COMMUNAL: "Service communal",
  CHEF_QUARTIER: "Chef de quartier",
  CHEF_RUE: "Chef de rue",
  CENI: "CENI – Commission électorale nationale indépendante",
  CENTRE_TRAITEMENT: "Centre de traitement des dossiers des candidats",
  CIRCONSCRIPTION: "Agent de circonscription électorale",
  CANDIDAT: "Candidat",
};

/** Niveau territorial obligatoire de l'affectation de chaque rôle. */
export const ROLE_SCOPE_LEVEL: Record<RoleCode, ScopeLevel> = {
  ADMIN: "NATIONAL",
  AUDITEUR: "NATIONAL",
  GOUVERNEUR: "PROVINCE",
  BOURGMESTRE: "COMMUNE",
  CHEF_BUREAU: "COMMUNE",
  SERVICE_COMMUNAL: "COMMUNE",
  CHEF_QUARTIER: "QUARTIER",
  CHEF_RUE: "RUE",
  CENI: "NATIONAL", // la CENI couvre l'ensemble des provinces de la RDC
  CENTRE_TRAITEMENT: "NATIONAL", // reçoit toutes les candidatures
  CIRCONSCRIPTION: "PROVINCE", // province de la circonscription (+ circonscriptionId dans l'affectation)
  CANDIDAT: "RUE", // périmètre minimal : la rue du candidat ; l'accès est limité à SA candidature
};

export const ROLE_PERMISSIONS: Record<RoleCode, readonly Permission[]> = {
  ADMIN: [
    "citizens:read", "citizens:update", "niu:verify", "cards:read", "biometrics:read", "declarations:read", "declarations:decide",
    "users:read", "users:create", "users:update", "governors:read", "governors:manage",
    "geography:read", "geography:manage", "reports:read", "audit:read",
    "elections:read", "candidatures:read", "results:read",
  ],
  AUDITEUR: ["geography:read", "governors:read", "reports:read", "audit:read", "elections:read", "candidatures:read", "results:read"],
  GOUVERNEUR: ["citizens:read", "declarations:read", "geography:read", "reports:read"],
  BOURGMESTRE: [
    "citizens:read", "citizens:update", "niu:verify", "cards:read", "declarations:read", "declarations:decide",
    "users:read", "users:create", "users:update", "geography:read", "reports:read",
  ],
  CHEF_BUREAU: [
    "citizens:read", "citizens:update", "niu:verify", "cards:read", "declarations:read", "declarations:decide",
    "users:read", "users:create", "users:update", "geography:read", "reports:read",
  ],
  SERVICE_COMMUNAL: [
    "citizens:read", "niu:verify", "cards:read", "cards:issue", "biometrics:read", "biometrics:capture", "geography:read",
  ],
  CHEF_QUARTIER: [
    "citizens:read", "niu:verify", "declarations:read", "declarations:decide",
    "users:read", "users:create", "users:update", "geography:read", "reports:read",
  ],
  CHEF_RUE: ["citizens:read", "citizens:create", "niu:verify", "declarations:read", "declarations:create", "geography:read"],
  CENI: [
    "elections:read", "elections:manage", "candidatures:read", "candidatures:create", "results:read",
    "users:read", "users:create", "users:update", "geography:read",
  ],
  CENTRE_TRAITEMENT: ["elections:read", "candidatures:read", "candidatures:decide", "results:read", "geography:read"],
  CIRCONSCRIPTION: ["elections:read", "candidatures:read", "candidatures:create", "results:read", "results:enter"],
  CANDIDAT: ["results:own"],
};

export function isRoleCode(value: unknown): value is RoleCode {
  return typeof value === "string" && (ROLE_CODES as readonly string[]).includes(value);
}

export function can(role: RoleCode, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Rôles qu'un rôle peut créer / suspendre (toujours dans son propre périmètre). */
export const MANAGEABLE_ROLES: Record<RoleCode, readonly RoleCode[]> = {
  ADMIN: ["AUDITEUR", "GOUVERNEUR", "BOURGMESTRE", "CHEF_BUREAU", "SERVICE_COMMUNAL", "CHEF_QUARTIER", "CHEF_RUE", "CENI"],
  AUDITEUR: [],
  GOUVERNEUR: [],
  BOURGMESTRE: ["CHEF_BUREAU", "SERVICE_COMMUNAL", "CHEF_QUARTIER", "CHEF_RUE"],
  CHEF_BUREAU: ["SERVICE_COMMUNAL", "CHEF_QUARTIER", "CHEF_RUE"],
  SERVICE_COMMUNAL: [],
  CHEF_QUARTIER: ["CHEF_RUE"],
  CHEF_RUE: [],
  // La CENI crée les comptes des circonscriptions de TOUTES les provinces et des centres de traitement.
  CENI: ["CIRCONSCRIPTION", "CENTRE_TRAITEMENT"],
  CENTRE_TRAITEMENT: [],
  CIRCONSCRIPTION: [],
  CANDIDAT: [],
};

export function canManageRole(actor: RoleCode, target: RoleCode): boolean {
  return MANAGEABLE_ROLES[actor]?.includes(target) ?? false;
}

/** Rôles à privilèges élevés : MFA exigée si MFA_ENFORCE=true. */
export const PRIVILEGED_ROLES: readonly RoleCode[] = ["ADMIN", "AUDITEUR", "GOUVERNEUR", "CENI"];
