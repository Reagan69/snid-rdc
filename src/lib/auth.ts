import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { SESSION_COOKIE, hashToken } from "@/lib/session";
import { PRIVILEGED_ROLES, isRoleCode } from "@/modules/roles/permissions";
import { isValidScope, type Scope } from "@/modules/geography/scope";
import type { AuthContext, RequestMeta } from "@/types/auth";

export function requestMeta(h: Headers): RequestMeta {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ip: h.get("x-real-ip") ?? forwarded ?? null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/** Contexte authentifié de la requête courante, ou null. Vérifie la session EN BASE (révocable). */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { affectation: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.actif) return null;

  const { user } = session;
  const a = user.affectation;
  if (!a || !isRoleCode(user.roleCode)) return null;
  const scope: Scope = { level: a.niveau, provinceId: a.provinceId, communeId: a.communeId, quartierId: a.quartierId, rueId: a.rueId };
  if (!isValidScope(scope)) {
    logger.error("Affectation territoriale invalide : accès refusé", { userId: user.id });
    return null;
  }

  // Activité glissante, écrite au plus toutes les 5 minutes.
  if (Date.now() - session.derniereActivite.getTime() > 300_000) {
    prisma.session.update({ where: { id: session.id }, data: { derniereActivite: new Date() } }).catch(() => undefined);
  }

  return {
    sessionId: session.id,
    user: {
      id: user.id,
      username: user.username,
      nomComplet: user.nomComplet,
      roleCode: user.roleCode,
      totpActif: user.totpActif,
      mustChangePassword: user.mustChangePassword,
    },
    scope,
    circonscriptionId: a.circonscriptionId ?? null,
    mfaPending: env().MFA_ENFORCE === "true" && PRIVILEGED_ROLES.includes(user.roleCode) && !user.totpActif,
    meta: requestMeta(await headers()),
  };
});

/** Pages : redirige vers /login si non connecté. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}
