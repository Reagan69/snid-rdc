// TOTP (RFC 6238, HMAC-SHA1, 6 chiffres, pas de 30 s) : authentification multifacteur sans dépendance.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of str.replace(/=+$/, "").replace(/\s/g, "").toUpperCase()) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("Secret TOTP invalide.");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function totp(secret: string, timeMs: number = Date.now(), step = 30, digits = 6): string {
  const counter = Math.floor(timeMs / 1000 / step);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = (h[h.length - 1] as number) & 15;
  const bin =
    (((h[offset] as number) & 127) << 24) |
    (((h[offset + 1] as number) & 255) << 16) |
    (((h[offset + 2] as number) & 255) << 8) |
    ((h[offset + 3] as number) & 255);
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** Vérifie un code avec une tolérance de ±`window` pas (dérive d'horloge). */
export function verifyTotp(secret: string, code: string, timeMs: number = Date.now(), window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  let ok = false;
  for (let w = -window; w <= window; w++) {
    const expected = Buffer.from(totp(secret, timeMs + w * 30_000));
    const given = Buffer.from(code);
    if (expected.length === given.length && timingSafeEqual(expected, given)) ok = true;
  }
  return ok;
}

export function otpauthUri(issuer: string, account: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
