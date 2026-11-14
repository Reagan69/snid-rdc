import type { Permission } from "@/modules/roles/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "users" | "userplus" | "search" | "file" | "card" | "shield" | "landmark" | "map" | "chart" | "scroll" | "settings" | "vote";
  permission?: Permission;
  /** Titre de section dans le menu (les entrées consécutives de même groupe sont regroupées). */
  group?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "home" },
  { href: "/citoyens", label: "Citoyens", icon: "users", permission: "citizens:read", group: "Identification" },
  { href: "/citoyens/nouveau", label: "Nouvelle identification", icon: "userplus", permission: "citizens:create", group: "Identification" },
  { href: "/identification", label: "Vérifier un NIU", icon: "search", permission: "niu:verify", group: "Identification" },
  { href: "/declarations", label: "Déclarations", icon: "file", permission: "declarations:read", group: "Identification" },
  { href: "/cartes", label: "Cartes", icon: "card", permission: "cards:read", group: "Identification" },
  { href: "/elections", label: "Scrutins", icon: "vote", permission: "elections:read", group: "Élections" },
  { href: "/circonscriptions", label: "Circonscriptions", icon: "map", permission: "elections:read", group: "Élections" },
  { href: "/candidatures", label: "Candidatures", icon: "file", permission: "candidatures:read", group: "Élections" },
  { href: "/mes-resultats", label: "Mes résultats", icon: "chart", permission: "results:own", group: "Élections" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: "shield", permission: "users:read", group: "Administration" },
  { href: "/administration/gouverneurs", label: "Gouverneurs", icon: "landmark", permission: "governors:read", group: "Administration" },
  { href: "/administration", label: "Administration territoriale", icon: "map", permission: "geography:read", group: "Administration" },
  { href: "/rapports", label: "Rapports", icon: "chart", permission: "reports:read", group: "Administration" },
  { href: "/audit", label: "Journal d'audit", icon: "scroll", permission: "audit:read", group: "Administration" },
  { href: "/parametres", label: "Mon compte", icon: "settings", group: "Compte" },
];
