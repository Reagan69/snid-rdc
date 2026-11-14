export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (m = "Requête invalide.", d?: unknown) => new AppError(400, "BAD_REQUEST", m, d),
  unauthorized: (m = "Authentification requise.") => new AppError(401, "UNAUTHORIZED", m),
  forbidden: (m = "Action non autorisée.") => new AppError(403, "FORBIDDEN", m),
  // Hors périmètre : 404 volontaire, pour ne pas révéler l'existence d'un dossier.
  notFound: (m = "Ressource introuvable.") => new AppError(404, "NOT_FOUND", m),
  conflict: (m = "Conflit avec l'état actuel des données.", d?: unknown) => new AppError(409, "CONFLICT", m, d),
  tooLarge: () => new AppError(413, "PAYLOAD_TOO_LARGE", "Corps de requête trop volumineux."),
  validation: (d: unknown) => new AppError(422, "VALIDATION_ERROR", "Données invalides.", d),
  tooMany: (retryAfter: number) => new AppError(429, "RATE_LIMITED", "Trop de requêtes. Réessayez plus tard.", { retryAfter }),
  mfaRequired: () => new AppError(403, "MFA_ENROLLMENT_REQUIRED", "Activez l'authentification multifacteur pour continuer."),
};
