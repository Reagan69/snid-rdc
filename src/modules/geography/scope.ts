// Périmètre territorial : logique pure (aucune dépendance), exécutable sous Node et sous Vitest.
// Un Scope porte TOUTE la chaîne d'ancêtres jusqu'à son niveau (ex. COMMUNE = province + commune).

export type ScopeLevel = "NATIONAL" | "PROVINCE" | "COMMUNE" | "QUARTIER" | "RUE";

export interface GeoRef {
  provinceId: string;
  communeId: string;
  quartierId: string;
  rueId: string;
}

export interface Scope {
  level: ScopeLevel;
  provinceId?: string | null;
  communeId?: string | null;
  quartierId?: string | null;
  rueId?: string | null;
}

export const SCOPE_DEPTH: Record<ScopeLevel, number> = {
  NATIONAL: 0,
  PROVINCE: 1,
  COMMUNE: 2,
  QUARTIER: 3,
  RUE: 4,
};

const ID_KEY: Record<Exclude<ScopeLevel, "NATIONAL">, keyof GeoRef> = {
  PROVINCE: "provinceId",
  COMMUNE: "communeId",
  QUARTIER: "quartierId",
  RUE: "rueId",
};

const CHAIN: (keyof GeoRef)[] = ["provinceId", "communeId", "quartierId", "rueId"];

/** Un périmètre est valide si tous les identifiants jusqu'à son niveau sont renseignés. */
export function isValidScope(scope: Scope): boolean {
  const depth = SCOPE_DEPTH[scope.level];
  if (depth === undefined) return false;
  return CHAIN.slice(0, depth).every((k) => typeof scope[k] === "string" && (scope[k] as string).length > 0);
}

/** La cible (dossier, déclaration, zone…) se trouve-t-elle dans le périmètre ? Refus par défaut. */
export function scopeIncludes(scope: Scope, target: Partial<GeoRef>): boolean {
  if (!isValidScope(scope)) return false;
  if (scope.level === "NATIONAL") return true;
  const key = ID_KEY[scope.level];
  const expected = scope[key];
  return !!expected && target[key] === expected;
}

/** Le périmètre `inner` est-il entièrement contenu dans `outer` ? (gestion des comptes subordonnés) */
export function scopeContains(outer: Scope, inner: Scope): boolean {
  if (!isValidScope(outer) || !isValidScope(inner)) return false;
  if (SCOPE_DEPTH[inner.level] < SCOPE_DEPTH[outer.level]) return false;
  return scopeIncludes(outer, {
    provinceId: inner.provinceId ?? undefined,
    communeId: inner.communeId ?? undefined,
    quartierId: inner.quartierId ?? undefined,
    rueId: inner.rueId ?? undefined,
  });
}

/** Fragment `where` Prisma (Citoyen, Declaration…) correspondant au périmètre. */
export function scopeWhere(scope: Scope): Partial<GeoRef> {
  if (!isValidScope(scope)) throw new Error("Périmètre territorial invalide");
  if (scope.level === "NATIONAL") return {};
  const key = ID_KEY[scope.level];
  return { [key]: scope[key] as string };
}
