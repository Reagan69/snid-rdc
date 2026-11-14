// Protection CSRF : cookies SameSite=Lax + contrôle de l'origine sur les méthodes qui modifient l'état.
export const UNSAFE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export function isSameOrigin(headers: { get(name: string): string | null }, appUrl: string): boolean {
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  let allowedHost = "";
  try {
    allowedHost = new URL(appUrl).host;
  } catch {
    /* APP_URL invalide : seul l'hôte de la requête compte */
  }
  if (origin) {
    try {
      const o = new URL(origin).host;
      return o === host || o === allowedHost;
    } catch {
      return false;
    }
  }
  // Pas d'en-tête Origin (outil serveur à serveur) : refuser seulement ce que le navigateur déclare inter-sites.
  return headers.get("sec-fetch-site") !== "cross-site";
}
