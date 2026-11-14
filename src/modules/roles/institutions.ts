import type { RoleCode } from "./permissions.ts";

export interface Institution {
  slug: "ceni" | "dgm";
  role: RoleCode;
  /** Rôles listés sur la page : le rôle de l'institution puis ceux de ses services (supervision). */
  roles: RoleCode[];
  sigle: string;
  nom: string;
  description: string;
  perimetre: string;
}

export const INSTITUTIONS: Record<"CENI" | "DGM", Institution> = {
  CENI: {
    slug: "ceni", role: "CENI", roles: ["CENI", "CIRCONSCRIPTION", "CENTRE_TRAITEMENT"], sigle: "CENI", nom: "Commission électorale nationale indépendante",
    description: "Organise les scrutins. Dans le SNID, elle crée les scrutins et les circonscriptions, fixe les sièges, enregistre les candidatures à la présidentielle et publie les résultats après contrôle.",
    perimetre: "National : l'ensemble des provinces",
  },
  DGM: {
    slug: "dgm", role: "DGM", roles: ["DGM", "AGENT_DGM"], sigle: "DGM", nom: "Direction générale de migration",
    description: "Service chargé des migrations et du contrôle aux frontières. Dans le SNID, elle gère ses agents, qui vérifient l'authenticité d'un NIU. Aucun n'a accès aux dossiers citoyens.",
    perimetre: "National : tout le territoire",
  },
};
