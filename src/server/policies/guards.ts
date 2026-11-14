// Politiques d'accès côté serveur : RBAC + périmètre territorial. Appelées dans CHAQUE service sensible.
import { Errors } from "@/lib/errors";
import { can, type Permission } from "@/modules/roles/permissions";
import { scopeIncludes, type GeoRef } from "@/modules/geography/scope";
import type { AuthContext } from "@/types/auth";

export function assertPermission(ctx: AuthContext, permission: Permission): void {
  if (!can(ctx.user.roleCode, permission)) throw Errors.forbidden();
}

/** Cible hors périmètre : 404 (jamais 403) pour ne pas confirmer l'existence du dossier. */
export function assertInScope(ctx: AuthContext, target: Partial<GeoRef>): void {
  if (!scopeIncludes(ctx.scope, target)) throw Errors.notFound();
}
