import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Règles d'architecture du document « Architecture professionnelle du SNID » vérifiées automatiquement.
const ROOT = join(import.meta.dirname ?? ".", "..", "..", "src");
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const all = files(ROOT).filter((f) => /\.(ts|tsx)$/.test(f));
const rel = (f: string) => f.slice(ROOT.length + 1).split("\\").join("/");
const read = (f: string) => readFileSync(f, "utf8");

describe("architecture", () => {
  it("aucun composant ni page React n'accède directement à Prisma / PostgreSQL", () => {
    const ui = all.filter((f) => rel(f).startsWith("components/") || /^app\/(?!api\/).*\.tsx$/.test(rel(f)));
    expect(ui.length).toBeGreaterThan(10);
    const offenders = ui.filter((f) => /@\/lib\/prisma|@prisma\/client/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("toute route API passe par withApi / withPublicApi (auth, CSRF, débit, erreurs)", () => {
    const routes = all.filter((f) => /^app\/api\/.*route\.ts$/.test(rel(f)));
    expect(routes.length).toBeGreaterThanOrEqual(20);
    const offenders = routes.filter((f) => !/withApi\(|withPublicApi\(/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("toute route protégée déclare une permission, ou est explicitement réservée à l'utilisateur connecté (allowPending)", () => {
    const routes = all.filter((f) => /^app\/api\/.*route\.ts$/.test(rel(f)) && /withApi\(/.test(read(f)));
    const offenders = routes.filter((f) => !/permission:|allowPending:/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("les routes publiques sont limitées en débit", () => {
    const routes = all.filter((f) => /^app\/api\/.*route\.ts$/.test(rel(f)) && /withPublicApi\(/.test(read(f)));
    expect(routes.length).toBe(4); // connexion, vérification de QR, tâche planifiée, santé
    expect(routes.filter((f) => !/rate:/.test(read(f))).map(rel)).toEqual([]);
  });

  it("les services appliquent une permission ou un périmètre avant d'accéder aux données", () => {
    const services = all.filter((f) => /modules\/.*\/services\/.*\.service\.ts$/.test(rel(f)));
    const exempt = ["niu.service.ts", "auth.service.ts"]; // atomique/technique ; l'authentification est celle de l'utilisateur lui-même
    const offenders = services
      .filter((f) => !exempt.some((e) => f.endsWith(e)))
      .filter((f) => !/assertPermission|scopeIncludes|scopeWhere/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("aucun secret ni mot de passe en clair dans le code", () => {
    const offenders = all.filter((f) => /(password|secret|token)\s*[:=]\s*["'][^"']{8,}["']/i.test(read(f).replace(/placeholder="[^"]*"/g, ""))).map(rel);
    expect(offenders).toEqual([]);
  });
});
