// Chiffrement AES-256-GCM des données sensibles au repos (secrets TOTP, futures données biométriques).
// Format : v1.<iv>.<tag>.<texte chiffré>, chaque partie en base64url. ENCRYPTION_KEY = 32 octets en base64.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function loadKey(b64: string | undefined = process.env.ENCRYPTION_KEY): Buffer {
  const key = Buffer.from(b64 ?? "", "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY invalide : 32 octets en base64 attendus (openssl rand -base64 32).");
  return key;
}

export function encrypt(plaintext: string, key: Buffer = loadKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string, key: Buffer = loadKey()): string {
  const [version, iv, tag, ct] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !ct) throw new Error("Format de données chiffrées invalide.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
