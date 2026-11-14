import { describe, expect, it } from "vitest";
import { generatePassword } from "../../src/lib/password-generator.ts";
import { validatePassword } from "../../src/lib/password-policy.ts";

describe("générateur de mot de passe initial", () => {
  it("respecte toujours la politique de mot de passe", () => {
    for (let i = 0; i < 500; i++) expect(validatePassword(generatePassword(), "n.kasongo")).toBeNull();
  });
  it("produit des valeurs différentes et de la bonne longueur", () => {
    const a = generatePassword(), b = generatePassword();
    expect(a).not.toBe(b);
    expect(a.length).toBe(16);
  });
});
