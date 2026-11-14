# Exigences de sécurité — état d'avancement

| # | Exigence du document | État | Où / comment |
|---|---|---|---|
| 1 | Authentification sécurisée, sessions révocables | Fait | `lib/session.ts`, `lib/auth.ts` : jeton aléatoire, SHA-256 en base, révocation (déconnexion, suspension, changement de mot de passe) |
| 2 | Mots de passe Argon2id | Fait | `lib/password.ts` (19 Mio, t=2) + politique `lib/password-policy.ts` (12 car., 3 classes) |
| 3 | MFA pour comptes privilégiés | Fait (à activer) | TOTP RFC 6238, `MFA_ENFORCE=true` l'impose à ADMIN, AUDITEUR, GOUVERNEUR |
| 4 | Permissions + juridictions territoriales | Fait | `roles/permissions.ts`, `geography/scope.ts`, `server/policies/guards.ts` ; hors périmètre → 404 + audit `ACCES_HORS_PERIMETRE` |
| 5 | Chiffrement au repos et en transit | Partiel | TLS (Vercel, base) ; secrets TOTP en AES-256-GCM ; chiffrement du disque = fournisseur de base. **À décider** : chiffrement applicatif des champs d'identité |
| 6 | Journalisation consultations et modifications | Fait | `JournalAudit` (ajout seul) : consultations, recherches, modifications avec avant/après et motif, décisions, connexions |
| 7 | Sauvegardes chiffrées, tests de restauration | À faire | Sauvegardes/PITR du fournisseur + exercice de restauration planifié |
| 8 | Injection SQL, XSS, CSRF | Fait | Prisma (requêtes paramétrées ; seul SQL brut : `SELECT 1` de santé), échappement React + CSP nonce, SameSite=Lax + contrôle d'origine |
| 9 | Détection de doublons | Partiel | Homonymes exacts (nom, postnom, prénom, sexe, naissance) à la déclaration. Déduplication biométrique : avec la biométrie réelle |
| 10 | Gestion des incidents | À faire | Procédure organisationnelle (détection, escalade, notification) |
| 11 | Séparation des environnements | Documenté | Bases distinctes Preview/Production (`docs/vercel`) |

## Autres protections mises en place
Anti-énumération (temps de réponse constant, message d'échec unique, vérification de NIU hors périmètre limitée au format), verrouillage après 5 échecs (15 min),
limitation de débit par IP et par compte, en-têtes HSTS/X-Frame-Options/CSP/COOP/CORP, réponses API en `no-store`, journaux sans données sensibles, QR de carte signé
(HMAC) n'exposant que validité + initiales, biométrie réelle **refusée** tant qu'aucun équipement certifié n'est intégré.

## Points à traiter avant un usage réel
Validation juridique, analyse d'impact (AIPD), revue de sécurité indépendante, test d'intrusion, politique de conservation et de suppression, gestion des clés (rotation d'`ENCRYPTION_KEY`), anti-rejeu des codes TOTP, horodatage/chaînage du journal d'audit pour la preuve.
