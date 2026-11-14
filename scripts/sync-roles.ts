// Synchronise la table des rôles avec le code (ajoute les rôles manquants, ex. DGM) SANS créer de compte ni de donnée de démonstration.
// À lancer après chaque mise à jour qui ajoute un rôle :  npx tsx scripts/sync-roles.ts
// Lit .env automatiquement (ou .env.production.local) ; utilise DATABASE_URL.
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { ROLE_CODES, ROLE_LABELS, ROLE_SCOPE_LEVEL } from "../src/modules/roles/permissions";

for (const f of [".env.production.local", ".env.local", ".env"]) {
  if (existsSync(f) && typeof process.loadEnvFile === "function") { process.loadEnvFile(f); console.log(`Fichier lu : ${f}`); break; }
}
const prisma = new PrismaClient();

async function main() {
  const avant = new Set((await prisma.role.findMany({ select: { code: true } })).map((r) => r.code));
  for (const code of ROLE_CODES) {
    await prisma.role.upsert({
      where: { code },
      create: { code, libelle: ROLE_LABELS[code], niveau: ROLE_SCOPE_LEVEL[code] },
      update: { libelle: ROLE_LABELS[code], niveau: ROLE_SCOPE_LEVEL[code] },
    });
  }
  const ajoutes = ROLE_CODES.filter((c) => !avant.has(c));
  console.log(ajoutes.length ? `Rôles ajoutés : ${ajoutes.join(", ")}` : "Aucun rôle à ajouter : la base est à jour.");
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
