// Contrôle de la configuration AVANT mise en ligne : npm run preflight
// Lit .env (ou l'environnement, ex. après « vercel env pull »). N'affiche jamais les valeurs.
import { existsSync } from "node:fs";

for (const f of [".env.production.local", ".env.local", ".env"]) {
  if (existsSync(f) && typeof process.loadEnvFile === "function") { process.loadEnvFile(f); console.log(`Fichier lu : ${f}`); break; }
}
const e = process.env;
const prod = process.argv.includes("--prod") || e.NODE_ENV === "production" || e.VERCEL_ENV === "production";
const results = [];
const check = (nom, ok, conseil, bloquant = true) => results.push({ nom, ok, conseil, bloquant });

check("DATABASE_URL (connexion poolée)", !!e.DATABASE_URL?.startsWith("postgres"), "URL PostgreSQL manquante ou invalide");
check("DIRECT_URL (migrations)", !!e.DIRECT_URL?.startsWith("postgres"), "URL PostgreSQL directe manquante");
check("DATABASE_URL avec pgbouncer / pooler", /pgbouncer=true|-pooler\./.test(e.DATABASE_URL ?? ""), "Utilisez la connexion poolée sur Vercel (voir .env.example)", false);
check("APP_URL", /^https?:\/\//.test(e.APP_URL ?? "") && (!prod || e.APP_URL.startsWith("https://")), "URL publique complète (https:// en production)");
check("ENCRYPTION_KEY (32 octets base64)", Buffer.from(e.ENCRYPTION_KEY ?? "", "base64").length === 32, "node scripts/generate-secrets.mjs");
check("SIGNING_SECRET (≥ 16 car.)", (e.SIGNING_SECRET ?? "").length >= 16, "node scripts/generate-secrets.mjs");
check("CRON_SECRET (≥ 16 car.)", (e.CRON_SECRET ?? "").length >= 16, "node scripts/generate-secrets.mjs");
check("Redis REST (limitation de débit partagée)", !!((e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN) || (e.KV_REST_API_URL && e.KV_REST_API_TOKEN)), "Sans Redis, la limitation de débit est par instance : insuffisant en production", false);
check("MFA_ENFORCE=true", e.MFA_ENFORCE === "true", "Recommandé en production pour ADMIN, AUDITEUR, GOUVERNEUR", false);
check("SEED_DEMO absent (aucun compte fictif)", prod ? e.SEED_DEMO !== "true" : true, "SEED_DEMO=true crée des comptes fictifs : à retirer de l'environnement de production");
check("BIOMETRICS_REAL_ENABLED=false", (e.BIOMETRICS_REAL_ENABLED ?? "false") === "false", "La biométrie réelle n'est pas intégrée");

let ko = 0;
for (const r of results) {
  const tag = r.ok ? "OK " : r.bloquant ? "KO " : "ATT";
  console.log(`${tag} ${r.nom}${r.ok ? "" : "  → " + r.conseil}`);
  if (!r.ok && r.bloquant) ko++;
}
console.log(ko ? `\n${ko} point(s) bloquant(s).` : "\nConfiguration prête (vérifiez les lignes ATT).");
process.exit(ko ? 1 : 0);
