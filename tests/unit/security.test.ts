import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../../src/lib/encryption.ts";
import { cardQrPayload, parseCardToken, sign, verifySignature } from "../../src/lib/signing.ts";
import { base32Decode, base32Encode, generateSecret, otpauthUri, totp, verifyTotp } from "../../src/lib/totp.ts";
import { validatePassword } from "../../src/lib/password-policy.ts";

const key = Buffer.alloc(32, 7);

describe("chiffrement AES-256-GCM", () => {
  it("chiffre puis déchiffre ; deux chiffrements du même texte diffèrent", () => {
    const a = encrypt("secret-totp", key);
    const b = encrypt("secret-totp", key);
    expect(a).not.toBe(b);
    expect(decrypt(a, key)).toBe("secret-totp");
    expect(a.startsWith("v1.")).toBe(true);
  });
  it("détecte toute altération et toute mauvaise clé", () => {
    const a = encrypt("donnée", key);
    const parts = a.split(".");
    parts[3] = Buffer.from("altere").toString("base64url");
    expect(() => decrypt(parts.join("."), key)).toThrow();
    expect(() => decrypt(a, Buffer.alloc(32, 8))).toThrow();
    expect(() => decrypt("n'importe quoi", key)).toThrow();
  });
});

describe("signature des QR de cartes", () => {
  const secret = "un-secret-de-test-suffisamment-long";
  it("signe et vérifie", () => {
    const s = sign("card:CD-01-12-05-0003-00027", secret);
    expect(verifySignature("card:CD-01-12-05-0003-00027", s, secret)).toBe(true);
    expect(verifySignature("card:CD-01-12-05-0003-00028", s, secret)).toBe(false);
    expect(verifySignature("card:CD-01-12-05-0003-00027", s, "autre-secret-de-test-assez-long")).toBe(false);
    expect(verifySignature("x", "", secret)).toBe(false);
  });
  it("charge utile du QR et lecture du jeton", () => {
    const url = cardQrPayload("https://snid.example.cd/", "CD-01-12-05-0003-00027", secret);
    expect(url.startsWith("https://snid.example.cd/verifier/CD-01-12-05-0003-00027.")).toBe(true);
    const token = url.split("/verifier/")[1] as string;
    const parsed = parseCardToken(token);
    expect(parsed?.niu).toBe("CD-01-12-05-0003-00027");
    expect(verifySignature(`card:${parsed?.niu}`, parsed?.signature ?? "", secret)).toBe(true);
  });
  it("refuse un secret trop court", () => {
    expect(() => sign("x", "court")).toThrow();
  });
});

describe("TOTP (RFC 6238)", () => {
  // Vecteurs de l'annexe B de la RFC 6238 (SHA-1, secret « 12345678901234567890 »), tronqués à 6 chiffres.
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  it("correspond aux vecteurs de test officiels", () => {
    expect(totp(secret, 59_000)).toBe("287082");
    expect(totp(secret, 1_111_111_109_000)).toBe("081804");
    expect(totp(secret, 1_234_567_890_000)).toBe("005924");
    expect(totp(secret, 2_000_000_000_000)).toBe("279037");
  });
  it("base32 aller-retour", () => {
    const raw = Buffer.from([1, 2, 3, 250, 251, 252, 0, 99]);
    expect(base32Decode(base32Encode(raw)).equals(raw)).toBe(true);
    expect(generateSecret().length).toBeGreaterThanOrEqual(32);
  });
  it("accepte la dérive d'un pas, rejette le reste", () => {
    const now = 1_700_000_000_000;
    const code = totp(secret, now);
    expect(verifyTotp(secret, code, now)).toBe(true);
    expect(verifyTotp(secret, code, now + 30_000)).toBe(true);
    expect(verifyTotp(secret, code, now + 120_000)).toBe(false);
    expect(verifyTotp(secret, "12345", now)).toBe(false);
    expect(verifyTotp(secret, "abcdef", now)).toBe(false);
  });
  it("URI otpauth", () => {
    expect(otpauthUri("SNID-RDC", "n.kasongo", "ABC")).toContain("secret=ABC");
  });
});

describe("politique de mot de passe", () => {
  it("refuse les mots de passe faibles", () => {
    expect(validatePassword("court1A!")).toBeTruthy();
    expect(validatePassword("aaaaaaaaaaaaaaaa")).toBeTruthy();
    expect(validatePassword("motdepasse123456")).toBeTruthy();
    expect(validatePassword("n.kasongo-Secure9", "n.kasongo")).toBeTruthy();
    expect(validatePassword("alllowercaseonlyletters")).toBeTruthy();
  });
  it("accepte un mot de passe robuste", () => {
    expect(validatePassword("Fleuve-Congo#2026x", "n.kasongo")).toBeNull();
  });
});
