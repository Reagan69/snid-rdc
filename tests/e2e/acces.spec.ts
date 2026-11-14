import { expect, test } from "@playwright/test";

// Parcours minimal sans base de données de test : contrôle d'accès et en-têtes de sécurité.
test("un visiteur non connecté est renvoyé vers la connexion", async ({ page }) => {
  await page.goto("/citoyens");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});

test("les API protégées refusent l'accès sans session", async ({ request }) => {
  const res = await request.get("/api/citoyens");
  expect(res.status()).toBe(401);
});

test("en-têtes de sécurité présents", async ({ request }) => {
  const res = await request.get("/login");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["strict-transport-security"]).toContain("max-age");
});

test("les API électorales refusent l'accès sans session", async ({ request }) => {
  for (const p of ["/api/scrutins", "/api/candidatures", "/api/circonscriptions", "/api/mes-resultats"]) {
    expect((await request.get(p)).status()).toBe(401);
  }
});

test("la page publique des résultats est accessible sans connexion", async ({ page }) => {
  await page.goto("/resultats");
  await expect(page.getByRole("heading", { name: "Résultats du vote" })).toBeVisible();
});
