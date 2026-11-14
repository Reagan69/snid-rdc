// Réinitialise (ou crée le diagnostic de) un compte : npx tsx scripts/reset-admin.ts
// Variables : RESET_USERNAME (défaut : SEED_ADMIN_USERNAME ou n.kasongo), RESET_PASSWORD (obligatoire, 12 caractères min.)
// Lit .env automatiquement. N'affiche jamais le mot de passe.
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { validatePassword } from "../src/lib/password-policy";

for (const f of [".env.production.local", ".env.local", ".env"]) {
  if (existsSync(f) && typeof process.loadEnvFile === "function") { process.loadEnvFile(f); console.log(`Fichier lu : ${f}`); break; }
}
const prisma = new PrismaClient();

async function main() {
  const username = (process.env.RESET_USERNAME || process.env.SEED_ADMIN_USERNAME || "n.kasongo").trim().toLowerCase();
  const all = await prisma.utilisateur.findMany({ select: { username: true, actif: true, roleCode: true, verrouilleJusqua: true, echecsConnexion: true } });
  console.log(`Comptes en base (${all.length}) :`);
  for (const u of all) console.log(` - ${u.username} [${u.roleCode}] actif=${u.actif} échecs=${u.echecsConnexion} verrou=${u.verrouilleJusqua?.toISOString() ?? "non"}`);

  const password = process.env.RESET_PASSWORD ?? "";
  if (!password) { console.log("\nRESET_PASSWORD non défini : diagnostic seulement, rien n'a été modifié."); return; }
  const issue = validatePassword(password, username);
  if (issue) throw new Error(`RESET_PASSWORD : ${issue}`);

  const user = await prisma.utilisateur.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (!user) { console.log(`\nAucun compte « ${username} ». Lancez d'abord : npm run db:seed`); return; }
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { username, passwordHash: await hashPassword(password), mustChangePassword: true, actif: true, echecsConnexion: 0, verrouilleJusqua: null },
  });
  console.log(`\nMot de passe de « ${username} » réinitialisé, compte déverrouillé. Connectez-vous (changement exigé à la première connexion).`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());