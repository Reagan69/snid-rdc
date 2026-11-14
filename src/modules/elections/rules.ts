// Règles du processus électoral : logique pure (aucune dépendance), exécutable sous Node et sous Vitest.

export const TYPES_SCRUTIN = ["PRESIDENTIELLE", "LEGISLATIVE_NATIONALE", "LEGISLATIVE_PROVINCIALE"] as const;
export type TypeScrutin = (typeof TYPES_SCRUTIN)[number];

export const STATUTS_SCRUTIN = ["PLANIFIE", "OUVERT", "CLOS"] as const;
export type StatutScrutin = (typeof STATUTS_SCRUTIN)[number];

export const TYPE_LABELS: Record<TypeScrutin, string> = {
  PRESIDENTIELLE: "Élection présidentielle",
  LEGISLATIVE_NATIONALE: "Législatives nationales",
  LEGISLATIVE_PROVINCIALE: "Législatives provinciales",
};

export const STATUT_SCRUTIN_LABELS: Record<StatutScrutin, string> = {
  PLANIFIE: "Planifié",
  OUVERT: "Ouvert",
  CLOS: "Clos",
};

export const isLegislative = (t: TypeScrutin): boolean => t !== "PRESIDENTIELLE";

/**
 * Âges minimaux. PARAMÈTRES À FAIRE VALIDER par la CENI et le service juridique (loi électorale en vigueur)
 * avant tout usage réel : ils sont centralisés ici pour être modifiés en un seul endroit.
 */
export const AGE_MINIMUM_ELECTEUR = 18;
export const AGE_MINIMUM_CANDIDAT: Record<TypeScrutin, number> = {
  PRESIDENTIELLE: 30,
  LEGISLATIVE_NATIONALE: 25,
  LEGISLATIVE_PROVINCIALE: 25,
};

function parts(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) throw new Error(`Date invalide : ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Âge révolu (en années) à la date `atIso`. Dates « civiles » AAAA-MM-JJ. */
export function ageAt(birthIso: string, atIso: string): number {
  const [by, bm, bd] = parts(birthIso);
  const [ay, am, ad] = parts(atIso);
  let age = ay - by;
  if (am < bm || (am === bm && ad < bd)) age -= 1;
  return age;
}

/** L'espace électeur n'est visible que si au moins un scrutin est OUVERT ; sinon il reste invisible. */
export function isElectorSpaceVisible(scrutins: readonly { statut: StatutScrutin }[]): boolean {
  return scrutins.some((s) => s.statut === "OUVERT");
}

export type ScrutinAction = "OUVRIR" | "CLORE";

/** Transitions autorisées : PLANIFIE → OUVERT → CLOS (jamais de retour en arrière). */
export function nextStatut(from: StatutScrutin, action: ScrutinAction): StatutScrutin | null {
  if (action === "OUVRIR" && from === "PLANIFIE") return "OUVERT";
  if (action === "CLORE" && from === "OUVERT") return "CLOS";
  return null;
}

/**
 * Qui enregistre quelles candidatures : chaque circonscription enregistre les candidatures LOCALES (législatives) ;
 * la présidentielle, sans circonscription locale, est enregistrée au niveau national par la CENI.
 */
export function canRegisterCandidature(role: string, type: TypeScrutin): boolean {
  if (role === "CENI") return type === "PRESIDENTIELLE";
  if (role === "CIRCONSCRIPTION") return isLegislative(type);
  return false;
}

/** Cohérence type de scrutin / circonscription : null si valide, sinon le message d'erreur. */
export function validateCandidatureTarget(type: TypeScrutin, circonscriptionId: string | null | undefined): string | null {
  if (type === "PRESIDENTIELLE") return circonscriptionId ? "Une candidature à la présidentielle n'est rattachée à aucune circonscription." : null;
  return circonscriptionId ? null : "Circonscription obligatoire pour une candidature législative.";
}

export function candidateAgeIssue(birthIso: string, type: TypeScrutin, scrutinIso: string): string | null {
  const min = AGE_MINIMUM_CANDIDAT[type];
  return ageAt(birthIso, scrutinIso) >= min ? null : `Âge minimum requis pour ce scrutin : ${min} ans à la date du scrutin.`;
}

export function voterAgeOk(birthIso: string, scrutinIso: string): boolean {
  return ageAt(birthIso, scrutinIso) >= AGE_MINIMUM_ELECTEUR;
}

/** Cohérence des totaux d'une circonscription. null si valide. */
export function validateResultTotals(t: { inscrits: number; votants: number; nuls: number; voix: readonly number[] }): string | null {
  const all = [t.inscrits, t.votants, t.nuls, ...t.voix];
  if (!all.every((n) => Number.isInteger(n) && n >= 0)) return "Les effectifs doivent être des entiers positifs ou nuls.";
  if (t.votants > t.inscrits) return "Le nombre de votants dépasse le nombre d'inscrits.";
  if (t.nuls > t.votants) return "Le nombre de bulletins nuls dépasse le nombre de votants.";
  const exprimes = t.voix.reduce((a, b) => a + b, 0);
  if (exprimes + t.nuls > t.votants) return "Voix des candidats + bulletins nuls : total supérieur au nombre de votants.";
  return null;
}

/** Classement « à la française » : les ex æquo partagent le même rang (1, 2, 2, 4…). */
export function rankResults<T extends { voix: number }>(rows: readonly T[]): (T & { rang: number })[] {
  const sorted = [...rows].sort((a, b) => b.voix - a.voix);
  const out: (T & { rang: number })[] = [];
  sorted.forEach((r, i) => {
    const prev = out[i - 1];
    out.push({ ...r, rang: prev && prev.voix === r.voix ? prev.rang : i + 1 });
  });
  return out;
}

/** Un candidat ne consulte les résultats qu'APRÈS le vote (scrutin clos) et une fois publiés par la CENI. */
export function resultsVisibleToCandidate(scrutinStatut: StatutScrutin, publie: boolean): boolean {
  return scrutinStatut === "CLOS" && publie;
}
