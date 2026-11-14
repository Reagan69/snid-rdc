// Enveloppe commune des routes API : authentification, autorisation, limitation de débit, CSRF, validation, erreurs.
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z, type ZodTypeAny } from "zod";
import { AppError, Errors } from "@/lib/errors";
import { getAuthContext, requestMeta } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, UNSAFE_METHODS } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { can, type Permission } from "@/modules/roles/permissions";
import type { AuthContext, RequestMeta } from "@/types/auth";

type RouteParams = Promise<Record<string, string | string[]>>;
export interface RouteContext {
  params: RouteParams;
}

export interface ApiOptions {
  permission?: Permission;
  /** Débit par IP + utilisateur ; défaut : 120 requêtes / minute. */
  rate?: { limit: number; windowSec: number };
  /** Autorise l'appel avant changement de mot de passe / activation MFA (routes /auth/*). */
  allowPending?: boolean;
}

export const json = (data: unknown, status = 200, headers?: HeadersInit) => NextResponse.json(data, { status, headers });

const MAX_BODY_BYTES = 1_000_000; // largement sous la limite Vercel de 4,5 Mo

export async function readBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw Errors.tooLarge();
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw Errors.tooLarge();
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw Errors.badRequest("Corps JSON invalide.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw Errors.validation(parsed.error.issues.map((i) => ({ champ: i.path.join("."), message: i.message })));
  }
  return parsed.data;
}

export function readQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    throw Errors.validation(parsed.error.issues.map((i) => ({ champ: i.path.join("."), message: i.message })));
  }
  return parsed.data;
}

export function idParam(params: Record<string, string | string[]>, key = "id"): string {
  const parsed = z.string().uuid().safeParse(params[key]);
  if (!parsed.success) throw Errors.notFound();
  return parsed.data;
}

function toResponse(e: unknown, requestId: string): NextResponse {
  if (e instanceof AppError) {
    const headers: Record<string, string> = {};
    if (e.status === 429) headers["Retry-After"] = String((e.details as { retryAfter: number }).retryAfter);
    return json({ error: { code: e.code, message: e.message, details: e.details, requestId } }, e.status, headers);
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return json({ error: { code: "CONFLICT", message: "Cette valeur existe déjà.", requestId } }, 409);
    if (e.code === "P2025") return json({ error: { code: "NOT_FOUND", message: "Ressource introuvable.", requestId } }, 404);
  }
  logger.error("Erreur API non gérée", { requestId, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
  return json({ error: { code: "INTERNAL", message: "Erreur interne.", requestId } }, 500);
}

function guardCsrf(req: NextRequest) {
  if (UNSAFE_METHODS.includes(req.method) && !isSameOrigin(req.headers, env().APP_URL)) {
    throw new AppError(403, "CSRF", "Origine de la requête refusée.");
  }
}

async function guardRate(req: NextRequest, meta: RequestMeta, userId: string | null, opts?: ApiOptions["rate"]) {
  const { limit, windowSec } = opts ?? { limit: 120, windowSec: 60 };
  const r = await rateLimit(`api:${req.nextUrl.pathname}:${userId ?? meta.ip ?? "anon"}`, limit, windowSec);
  if (!r.ok) throw Errors.tooMany(r.retryAfter);
}

/** Route protégée : session valide, permission, limitation de débit, CSRF. */
export function withApi(
  opts: ApiOptions,
  handler: (a: { req: NextRequest; auth: AuthContext; params: Record<string, string | string[]> }) => Promise<Response>,
) {
  return async (req: NextRequest, rc: RouteContext): Promise<Response> => {
    const requestId = crypto.randomUUID();
    try {
      guardCsrf(req);
      const auth = await getAuthContext();
      if (!auth) throw Errors.unauthorized();
      await guardRate(req, auth.meta, auth.user.id, opts.rate);
      if (!opts.allowPending) {
        if (auth.user.mustChangePassword) throw new AppError(403, "PASSWORD_CHANGE_REQUIRED", "Changez votre mot de passe pour continuer.");
        if (auth.mfaPending) throw Errors.mfaRequired();
      }
      if (opts.permission && !can(auth.user.roleCode, opts.permission)) throw Errors.forbidden();
      return await handler({ req, auth, params: await rc.params });
    } catch (e) {
      return toResponse(e, requestId);
    }
  };
}

/** Route publique (connexion, vérification de carte, tâches planifiées) : limitation de débit stricte par IP. */
export function withPublicApi(
  opts: { rate: { limit: number; windowSec: number }; csrf?: boolean },
  handler: (a: { req: NextRequest; meta: RequestMeta; params: Record<string, string | string[]> }) => Promise<Response>,
) {
  return async (req: NextRequest, rc: RouteContext): Promise<Response> => {
    const requestId = crypto.randomUUID();
    try {
      if (opts.csrf !== false) guardCsrf(req);
      const meta = requestMeta(req.headers);
      await guardRate(req, meta, null, opts.rate);
      return await handler({ req, meta, params: await rc.params });
    } catch (e) {
      return toResponse(e, requestId);
    }
  };
}
