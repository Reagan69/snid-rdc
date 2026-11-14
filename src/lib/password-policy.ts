// Politique de mot de passe (logique pure). Retourne un message d'erreur ou null.
const COMMON = ["motdepasse123", "password1234", "123456789012", "azertyuiop12", "qwertyuiop12", "kinshasa2026", "snid-rdc-2026"];

export function validatePassword(password: string, username = ""): string | null {
  if (typeof password !== "string" || password.length < 12) return "Le mot de passe doit contenir au moins 12 caractères.";
  if (password.length > 128) return "Le mot de passe est trop long (128 caractères maximum).";
  const lower = password.toLowerCase();
  if (username && lower.includes(username.toLowerCase())) return "Le mot de passe ne doit pas contenir l'identifiant.";
  if (COMMON.some((c) => lower.includes(c))) return "Mot de passe trop courant.";
  if (new Set(password).size < 6) return "Mot de passe trop répétitif.";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) return "Utilisez au moins 3 types de caractères (minuscules, majuscules, chiffres, symboles).";
  return null;
}
