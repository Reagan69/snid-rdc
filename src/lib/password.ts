// Mots de passe : Argon2id (module natif @node-rs/argon2, binaires précompilés pour Vercel/Linux).
// Paramètres : recommandations OWASP minimales (19 Mio, 2 itérations, 1 voie). Ajustez selon la mesure en production.
import { hash, verify } from "@node-rs/argon2";

const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
/** Vérification factice pour un identifiant inconnu : temps de réponse comparable (anti-énumération). */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummy ??= hashPassword("mot-de-passe-factice-anti-enumeration");
  await verifyPassword(await dummy, password);
}
