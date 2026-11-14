/**
 * Jeu de données initial : `npx prisma db seed`
 *  - toujours : rôles, géographie (26 provinces, communes, territoires, quartiers, secteurs), compte administrateur ;
 *  - si SEED_DEMO=true : comptes et dossiers FICTIFS de démonstration (jamais en production réelle).
 * Aucun mot de passe par défaut : SEED_ADMIN_PASSWORD (et SEED_DEMO_PASSWORD) sont obligatoires, 12 caractères minimum.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, type CommuneKind, type ProvinceStatut, type QuartierKind } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { validatePassword } from "../src/lib/password-policy";
import { allocateNiu } from "../src/modules/niu/services/niu.service";
import { ROLE_CODES, ROLE_LABELS, ROLE_SCOPE_LEVEL, type RoleCode } from "../src/modules/roles/permissions";
import type { Scope } from "../src/modules/geography/scope";

const prisma = new PrismaClient();

interface Geo {
  provinces: { code: number; nom: string; chefLieu: string; statut: ProvinceStatut }[];
  communes: { province: string; nom: string; ville: string | null; kind: CommuneKind }[];
  quartiers: { province: string; commune: string; communeKind: CommuneKind; ville: string | null; kind: QuartierKind; nom: string }[];
}

const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function seedRoles() {
  for (const code of ROLE_CODES) {
    await prisma.role.upsert({
      where: { code },
      create: { code, libelle: ROLE_LABELS[code], niveau: ROLE_SCOPE_LEVEL[code] },
      update: { libelle: ROLE_LABELS[code], niveau: ROLE_SCOPE_LEVEL[code] },
    });
  }
}

async function seedGeography() {
  if ((await prisma.province.count()) > 0) {
    console.log("Géographie déjà présente : ignorée.");
    return;
  }
  const geo = JSON.parse(readFileSync(join(__dirname, "data", "geo.json"), "utf8")) as Geo;
  const provId = new Map<string, string>();
  await prisma.province.createMany({
    data: geo.provinces.map((p) => {
      const id = randomUUID();
      provId.set(p.nom, id);
      return { id, code: p.code, nom: p.nom, chefLieu: p.chefLieu, statut: p.statut };
    }),
  });

  // Codes NIU = rang dans l'ordre du fichier source (Kinshasa : ordre historique, donc NIU inchangés).
  const communeCount = new Map<string, number>();
  const communeId = new Map<string, string>();
  const communes = geo.communes.map((c) => {
    const code = (communeCount.get(c.province) ?? 0) + 1;
    communeCount.set(c.province, code);
    if (code > 99) throw new Error(`Plus de 99 communes/territoires dans ${c.province} : le NIU (2 chiffres) est insuffisant.`);
    const id = randomUUID();
    communeId.set(`${c.province}|${c.kind}|${c.nom}|${c.ville ?? ""}`, id);
    return { id, provinceId: provId.get(c.province) as string, code, nom: c.nom, ville: c.ville, kind: c.kind };
  });
  for (const part of chunk(communes, 500)) await prisma.commune.createMany({ data: part });

  const quartierCount = new Map<string, number>();
  const quartiers = geo.quartiers.map((q) => {
    const cid = communeId.get(`${q.province}|${q.communeKind}|${q.commune}|${q.ville ?? ""}`);
    if (!cid) throw new Error(`Commune introuvable pour le quartier ${q.nom} (${q.commune}, ${q.province})`);
    const code = (quartierCount.get(cid) ?? 0) + 1;
    quartierCount.set(cid, code);
    if (code > 99) throw new Error(`Plus de 99 quartiers/secteurs dans ${q.commune} : le NIU (2 chiffres) est insuffisant.`);
    return { communeId: cid, code, nom: q.nom, kind: q.kind };
  });
  for (const part of chunk(quartiers, 500)) await prisma.quartier.createMany({ data: part });
  console.log(`Géographie : ${geo.provinces.length} provinces, ${communes.length} communes/territoires, ${quartiers.length} quartiers/secteurs.`);
}

async function createUser(opts: {
  username: string; nomComplet: string; role: RoleCode; password: string; scope: Scope; demo: boolean; circonscriptionId?: string;
}) {
  if (await prisma.utilisateur.findUnique({ where: { username: opts.username } })) return null;
  return prisma.utilisateur.create({
    data: {
      username: opts.username, nomComplet: opts.nomComplet, roleCode: opts.role, passwordHash: await hashPassword(opts.password),
      mustChangePassword: true, demo: opts.demo,
      affectation: { create: { niveau: opts.scope.level, provinceId: opts.scope.provinceId ?? null, communeId: opts.scope.communeId ?? null, quartierId: opts.scope.quartierId ?? null, rueId: opts.scope.rueId ?? null, circonscriptionId: opts.circonscriptionId ?? null } },
    },
  });
}

function requirePassword(name: string): string {
  const pw = process.env[name] ?? "";
  const issue = validatePassword(pw);
  if (issue) throw new Error(`${name} : ${issue}`);
  return pw;
}

async function seedAdmin() {
  const username = (process.env.SEED_ADMIN_USERNAME || "n.kasongo").trim().toLowerCase(); // la connexion compare en minuscules
  const created = await createUser({ username, nomComplet: "Administrateur ONIP", role: "ADMIN", password: requirePassword("SEED_ADMIN_PASSWORD"), scope: { level: "NATIONAL" }, demo: false });
  console.log(created ? `Administrateur créé : ${username} (mot de passe temporaire à changer à la première connexion).` : "Administrateur déjà présent.");
}

const FICTIFS = [
  ["MUKENDI", "KALALA", "Josué", "M", "1988-04-12"], ["NGOYI", "MBUYI", "Esther", "F", "1992-09-03"],
  ["TSHIMANGA", "KABONGO", "Patrick", "M", "1979-01-25"], ["MUTOMBO", "ILUNGA", "Rachel", "F", "2001-06-18"],
  ["KASONGO", "NSENGA", "David", "M", "1995-11-30"], ["LUMBALA", "MWAMBA", "Grâce", "F", "1985-03-07"],
  ["BANZA", "KITENGE", "Olivier", "M", "1969-08-21"], ["KABEYA", "TSHIBANGU", "Marie", "F", "1999-12-02"],
  ["MWEPU", "KYUNGU", "Samuel", "M", "2010-05-14"], ["ILUNGA", "BANZE", "Sarah", "F", "1990-07-09"],
  ["NSIMBA", "LUKUSA", "Daniel", "M", "1983-02-16"], ["MAYELE", "KANKU", "Béatrice", "F", "1976-10-28"],
] as const;

async function seedDemo() {
  if (process.env.SEED_DEMO !== "true") return;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("SEED_DEMO=true refusé en production : les comptes de démonstration sont fictifs.");
  }
  const password = requirePassword("SEED_DEMO_PASSWORD");
  const nat: Scope = { level: "NATIONAL" };
  await createUser({ username: "a.lukusa", nomComplet: "Auditeur de démonstration", role: "AUDITEUR", password, scope: nat, demo: true });

  // Processus électoral (comptes FICTIFS) : CENI nationale, centre de traitement, une circonscription à Limete.
  await createUser({ username: "ceni.demo", nomComplet: "CENI — compte de démonstration", role: "CENI", password, scope: nat, demo: true });
  await createUser({ username: "ct.demo", nomComplet: "Centre de traitement des dossiers (démo)", role: "CENTRE_TRAITEMENT", password, scope: nat, demo: true });
  const kin = await prisma.province.findUnique({ where: { nom: "Kinshasa" } });
  const lim = await prisma.commune.findFirst({ where: { nom: "Limete", province: { nom: "Kinshasa" } } });
  if (kin && lim) {
    const circ = await prisma.circonscription.upsert({
      where: { provinceId_code: { provinceId: kin.id, code: 1 } },
      create: { provinceId: kin.id, communeId: lim.id, code: 1, nom: "Circonscription de Limete (démo)" },
      update: {},
    });
    await createUser({ username: "cs.limete", nomComplet: "Agent de la circonscription de Limete (démo)", role: "CIRCONSCRIPTION", password, scope: { level: "PROVINCE", provinceId: kin.id }, demo: true, circonscriptionId: circ.id });
  }

  // 26 gouverneurs « à désigner », un par province (comptes fictifs, périmètre = la province).
  const provinces = await prisma.province.findMany({ orderBy: { code: "asc" } });
  for (const p of provinces) {
    const nom = p.statut === "VILLE_PROVINCE" ? `Gouverneur de la ville-province de ${p.nom} (à désigner)` : `Gouverneur de ${p.nom} (à désigner)`;
    await createUser({ username: `gv.${slug(p.nom)}`, nomComplet: nom, role: "GOUVERNEUR", password, scope: { level: "PROVINCE", provinceId: p.id }, demo: true });
  }

  // Chaîne complète à Limete (Kinshasa).
  const commune = await prisma.commune.findFirst({ where: { nom: "Limete", province: { nom: "Kinshasa" } }, include: { quartiers: { orderBy: { code: "asc" }, take: 1 } } });
  const quartier = commune?.quartiers[0];
  if (!commune || !quartier) throw new Error("Limete introuvable : exécutez d'abord le seed de la géographie.");
  const rues = await Promise.all(["Avenue de la Libération", "Avenue du Commerce"].map((nom, i) =>
    prisma.rue.upsert({ where: { quartierId_nom: { quartierId: quartier.id, nom } }, create: { quartierId: quartier.id, code: i + 1, nom }, update: {} })));
  const base = { provinceId: commune.provinceId, communeId: commune.id };
  await createUser({ username: "b.limete", nomComplet: "Bourgmestre de Limete (démo)", role: "BOURGMESTRE", password, scope: { level: "COMMUNE", ...base }, demo: true });
  await createUser({ username: "s.tshala", nomComplet: "Chef de bureau de Limete (démo)", role: "CHEF_BUREAU", password, scope: { level: "COMMUNE", ...base }, demo: true });
  await createUser({ username: "sc.limete", nomComplet: "Service communal de Limete (démo)", role: "SERVICE_COMMUNAL", password, scope: { level: "COMMUNE", ...base }, demo: true });
  await createUser({ username: "cq.limete", nomComplet: "Chef de quartier (démo)", role: "CHEF_QUARTIER", password, scope: { level: "QUARTIER", ...base, quartierId: quartier.id }, demo: true });
  await createUser({ username: "cr.limete", nomComplet: "Chef de rue (démo)", role: "CHEF_RUE", password, scope: { level: "RUE", ...base, quartierId: quartier.id, rueId: (rues[0] as { id: string }).id }, demo: true });

  // Dossiers fictifs (marqués demo), NIU attribués par le même mécanisme atomique que la production.
  const province = await prisma.province.findUniqueOrThrow({ where: { id: commune.provinceId } });
  const rue = rues[0] as { id: string; code: number };
  if ((await prisma.citoyen.count({ where: { demo: true } })) === 0) {
    for (const [nom, postnom, prenom, sexe, naissance] of FICTIFS) {
      await prisma.$transaction(async (tx) => {
        const niu = await allocateNiu(tx, { province: province.code, commune: commune.code, quartier: quartier.code, rue: rue.code });
        await tx.citoyen.create({
          data: { niu, nom, postnom, prenom, sexe, dateNaissance: new Date(`${naissance}T00:00:00Z`), provinceId: commune.provinceId, communeId: commune.id, quartierId: quartier.id, rueId: rue.id, demo: true },
        });
      });
    }
  }
  console.log("Démonstration : 26 gouverneurs, chaîne de Limete et 12 dossiers FICTIFS créés.");
}

async function main() {
  await seedRoles();
  await seedGeography();
  await seedAdmin();
  await seedDemo();
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());