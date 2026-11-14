import type { NextConfig } from "next";

/**
 * Configuration compatible Vercel.
 * - L'en-tête CSP (avec nonce) est posé par src/middleware.ts ; les autres en-têtes de sécurité ci-dessous.
 * - @node-rs/argon2 est un module natif : il doit rester externe au bundle serverless.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Le lint est exécuté par la CI (npm run lint) : une alerte de style ne doit pas empêcher un déploiement.
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@node-rs/argon2"],
  // Docker / hébergement souverain uniquement (NEXT_OUTPUT=standalone). Sur Vercel : laisser vide.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Allège les fonctions serverless (limite Vercel : 250 Mo) : ces dossiers ne servent jamais à l'exécution.
  outputFileTracingExcludes: {
    "*": ["prisma/data/**", "docs/**", "tests/**", ".github/**"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Les réponses API contiennent des données personnelles : jamais de cache partagé.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
};

export default config;
