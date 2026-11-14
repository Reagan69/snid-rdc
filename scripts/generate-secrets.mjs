// Génère les trois secrets de l'application : node scripts/generate-secrets.mjs
import { randomBytes } from "node:crypto";

const b64 = (n) => randomBytes(n).toString("base64");
console.log(`ENCRYPTION_KEY="${b64(32)}"`);
console.log(`SIGNING_SECRET="${b64(32)}"`);
console.log(`CRON_SECRET="${b64(32)}"`);
console.error("\nCopiez ces lignes dans Vercel (Settings → Environment Variables). Ne les committez jamais.");
