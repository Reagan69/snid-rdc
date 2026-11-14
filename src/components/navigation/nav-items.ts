import type { Permission } from "@/modules/roles/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "users" | "userplus" | "search" | "file" | "card" | "shield" | "landmark" | "map" | "chart" | "scroll" | "settings" | "vote";
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: "home" },
  { href: "/citoyens", label: "Citoyens", icon: "users", permission: "citizens:read" },
  { href: "/citoyens/nouveau", label: "Nouvelle identification", icon: "userplus", permission: "citizens:create" },
  { href: "/identification", label: "Vérifier un NIU", icon: "search", permission: "niu:verify" },
  { href: "/declarations", label: "Déclarations", icon: "file", permission: "declarations:read" },
  { href: "/cartes", label: "Cartes", icon: "card", permission: "cards:read" },
  { href: "/elections", label: "Scrutins", icon: "vote", permission: "elections:read" },
  { href: "/circonscriptions", label: "Circonscriptions", icon: "map", permission: "elections:read" },
  { href: "/candidatures", label: "Candidatures", icon: "file", permission: "candidatures:read" },
  { href: "/mes-resultats", label: "Mes résultats", icon: "chart", permission: "results:own" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: "shield", permission: "users:read" },
  { href: "/administration/gouverneurs", label: "Gouverneurs", icon: "landmark", permission: "governors:read" },
  { href: "/administration", label: "Administration territoriale", icon: "map", permission: "geography:read" },
  { href: "/rapports", label: "Rapports", icon: "chart", permission: "reports:read" },
  { href: "/audit", label: "Journal d'audit", icon: "scroll", permission: "audit:read" },
  { href: "/parametres", label: "Mon compte", icon: "settings" },
];
