// Libellés lisibles du journal d'audit. Formulations neutres (sans genre) : « Déclaration validée », pas « a validé ».
const LABELS: Record<string, string> = {
  CONNEXION: "Connexion", DECONNEXION: "Déconnexion", CONNEXION_ECHEC: "Échec de connexion",
  MOT_DE_PASSE_CHANGE: "Mot de passe modifié", MOT_DE_PASSE_REINITIALISE: "Mot de passe réinitialisé", CHANGEMENT_MDP_ECHEC: "Échec de changement de mot de passe",
  MFA_ACTIVEE: "Double authentification activée", MFA_REINITIALISEE: "Double authentification réinitialisée",
  CITOYEN_CONSULTE: "Dossier citoyen consulté", CITOYENS_RECHERCHE: "Recherche de citoyens", CITOYEN_MODIFIE: "Dossier citoyen modifié",
  NIU_VERIFIE: "NIU vérifié", BIOMETRIE_SIMULEE: "Biométrie de démonstration capturée",
  DECLARATION_CREEE: "Déclaration déposée", DECLARATION_APPROUVEE_NIVEAU: "Déclaration approuvée à un niveau", DECLARATION_VALIDEE: "Déclaration validée", DECLARATION_REJETEE: "Déclaration rejetée",
  CARTE_EMISE: "Carte émise", CARTE_CONSULTEE: "Carte consultée",
  UTILISATEUR_CREE: "Compte utilisateur créé", UTILISATEUR_MODIFIE: "Compte utilisateur modifié", UTILISATEUR_SUSPENDU: "Compte suspendu", UTILISATEUR_REACTIVE: "Compte réactivé", UTILISATEUR_SUPPRIME: "Compte supprimé",
  SCRUTIN_CREE: "Scrutin créé", CIRCONSCRIPTION_CREEE: "Circonscription créée", SIEGES_DEFINIS: "Sièges définis", RESULTATS_SAISIS: "Résultats saisis", RESULTATS_PUBLIES: "Résultats publiés", RESULTATS_CONSULTES_CANDIDAT: "Résultats consultés par un candidat",
  CANDIDATURE_ENREGISTREE: "Candidature enregistrée", COMPTE_CANDIDAT_CREE: "Compte candidat créé",
  ACCES_HORS_PERIMETRE: "Accès refusé : hors périmètre",
};

export function auditLabel(action: string): string {
  return LABELS[action] ?? action.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** « à l'instant », « il y a 5 minutes », « il y a 2 jours ». */
export function relativeTime(d: Date, now: number = Date.now()): string {
  const s = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(s);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}
