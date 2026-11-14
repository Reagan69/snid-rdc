// Applique le schéma à la base : npm run db:deploy   (avec DIRECT_URL de la base cible)
// - si prisma/migrations contient des migrations : « prisma migrate deploy » (voie recommandée) ;
// - sinon (première mise en ligne, migration pas encore générée) : « prisma db push » avec avertissement.
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Charge le premier fichier d'environnement trouvé (Node ne lit pas .env tout seul).
for (const f of [".env.production.local", ".env.local", ".env"]) {
  if (existsSync(f) && typeof process.loadEnvFile === "function") { process.loadEnvFile(f); console.log(`Fichier lu : ${f}`); break; }
}

if (!process.env.DIRECT_URL) {
  console.error("DIRECT_URL manquante : utilisez la connexion DIRECTE (sans pool) de la base cible.");
  process.exit(1);
}
const hasMigrations = existsSync("prisma/migrations") && readdirSync("prisma/migrations", { withFileTypes: true }).some((d) => d.isDirectory());
const args = hasMigrations ? ["prisma", "migrate", "deploy"] : ["prisma", "db", "push", "--skip-generate"];
if (!hasMigrations) {
  console.warn("ATTENTION : aucune migration versionnée. « db push » crée le schéma sans historique.\n" +
    "Générez ensuite la migration initiale en local (npx prisma migrate dev --name init), committez-la, puis utilisez « migrate deploy ».");
}
const r = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(r.status ?? 1);
