// Signature HMAC-SHA256 : QR code des cartes (vérification publique sans exposer de données personnelles).
import { createHmac, timingSafeEqual } from "node:crypto";

export function sign(message: string, secret: string): string {
  if (!secret || secret.length < 16) throw new Error("SIGNING_SECRET manquant ou trop court.");
  return createHmac("sha256", secret).update(message).digest("base64url").slice(0, 22);
}

export function verifySignature(message: string, signature: string, secret: string): boolean {
  try {
    const a = Buffer.from(sign(message, secret));
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Charge utile du QR : https://…/verifier/<NIU>.<signature>  */
export function cardQrPayload(appUrl: string, niu: string, secret: string): string {
  return `${appUrl.replace(/\/$/, "")}/verifier/${niu}.${sign(`card:${niu}`, secret)}`;
}

export function parseCardToken(token: string): { niu: string; signature: string } | null {
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  return { niu: token.slice(0, i), signature: token.slice(i + 1) };
}
