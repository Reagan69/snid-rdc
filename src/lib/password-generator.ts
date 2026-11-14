// Mot de passe initial aléatoire (CSPRNG) : 16 caractères, 4 classes, sans caractères ambigus (0/O, 1/l/I).
import { randomInt } from "node:crypto";

const SETS = ["abcdefghjkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!#$%&*+-=?@"];

export function generatePassword(length = 16): string {
  const all = SETS.join("");
  const chars = SETS.map((s) => s[randomInt(s.length)] as string);
  while (chars.length < length) chars.push(all[randomInt(all.length)] as string);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  return chars.join("");
}
