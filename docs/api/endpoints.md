# API (JSON, cookie de session, en-tête `Origin` requis pour les méthodes qui modifient)

Erreurs : `{ "error": { "code", "message", "details?", "requestId" } }` — 401 non connecté · 403 permission/CSRF · 404 absent **ou hors périmètre** · 409 conflit · 422 validation · 429 débit.

| Méthode | Route | Permission | Rôle de la route |
|---|---|---|---|
| POST | /api/auth/login | publique (10/min/IP) | Connexion (+ code TOTP si activé) |
| POST | /api/auth/logout | session | Déconnexion (révocation) |
| GET | /api/auth/me | session | Profil, périmètre, permissions |
| POST | /api/auth/password | session | Changer le mot de passe |
| POST | /api/auth/mfa/setup · /enable | session | Activer la MFA (TOTP) |
| GET | /api/citoyens | citizens:read | Rechercher (périmètre appliqué) |
| POST | /api/citoyens | citizens:create | Demande d'identification (202) |
| GET · PATCH | /api/citoyens/[id] | citizens:read · citizens:update | Dossier · correction avec motif (audit avant/après) |
| POST | /api/citoyens/[id]/biometrie | biometrics:capture | Capture **simulée** |
| POST | /api/niu/generer | citizens:create | Aperçu du prochain NIU (non réservé) |
| POST | /api/niu/verifier | niu:verify | Vérifier un NIU |
| GET · POST | /api/cartes | cards:read · cards:issue | Lister · délivrer (renouvelle) |
| GET | /api/cartes/[id] | cards:read | Carte + QR signé |
| GET | /api/verifier/[token] | publique (30/min/IP) | Vérification publique d'un QR |
| GET · POST | /api/declarations | declarations:read · :create | Lister · déposer (chef de rue) |
| POST | /api/declarations/[id]/decision | declarations:decide | Approuver / rejeter (à son tour) |
| GET · POST | /api/utilisateurs | users:read · users:create | Comptes subordonnés |
| PATCH | /api/utilisateurs/[id] | users:update | Suspendre, réactiver, modifier, réinitialiser mot de passe / MFA |
| GET | /api/gouverneurs | governors:read | 26 provinces et leur gouverneur |
| GET | /api/geographie | geography:read | Navigation province → rue (périmètre) |
| GET | /api/rapports | reports:read | Synthèse et rapport par commune |
| GET | /api/audit | audit:read | Journal d'audit |
| GET · POST | /api/scrutins | elections:read · elections:manage | Lister · créer un scrutin (CENI) |
| GET · PATCH | /api/scrutins/[id] | elections:read · elections:manage | Détail · `{action: OUVRIR \| CLORE}` (CENI) |
| PUT | /api/scrutins/[id]/sieges | elections:manage | Rattacher une circonscription et fixer ses sièges (scrutin planifié) |
| GET · PUT · POST | /api/scrutins/[id]/resultats | results:read · results:enter · elections:manage | Lire · saisir (agent de circonscription, scrutin clos) · publier (CENI) |
| GET · POST | /api/circonscriptions | elections:read · elections:manage | Lister · créer (toutes provinces, CENI) |
| GET · POST | /api/candidatures | candidatures:read · candidatures:create | Lister · enregistrer (présidentielle : CENI ; législatives : circonscription). Doublon → 409 `DUPLICATE_CANDIDATURE` |
| PATCH | /api/candidatures/[id] | candidatures:decide | Recevable / rejetée (centre de traitement) |
| POST | /api/candidatures/[id]/compte | candidatures:decide | Compte candidat (candidature recevable) |
| GET | /api/mes-resultats | results:own | Résultats publiés du candidat, après la clôture du scrutin |
| GET | /api/health | publique (30/min/IP) | Supervision : `{"status":"ok"}` ou 503 |
| GET | /api/cron/purge | `CRON_SECRET` | Tâche planifiée Vercel |
