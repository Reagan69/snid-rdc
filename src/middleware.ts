// Middleware Vercel (runtime Edge) : AUCUN accès base de données ici (Prisma n'y est pas utilisable).
// Rôle : en-tête CSP avec nonce, redirection rapide des visiteurs sans cookie. La vraie vérification de la session
// (révocation, expiration, rôle, périmètre) est faite côté serveur, en base, dans getAuthContext() et withApi().
// Next.js 16 renomme ce fichier « proxy.ts » : le contenu reste identique.
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = process.env.NODE_ENV === "production" ? "__Host-snid_session" : "snid_session";
const PUBLIC_PREFIXES = ["/login", "/verifier", "/electeur", "/resultats"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isPublic && !req.cookies.get(COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-pathname", pathname);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Pages uniquement : ni les API (protégées par withApi), ni les fichiers statiques.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
