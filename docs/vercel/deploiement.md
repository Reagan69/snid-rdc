# Déploiement sur Vercel — contraintes et décisions

Vercel exécute l'application en **fonctions serverless** (sans disque persistant, sans processus longs, sans Docker). L'architecture
du document d'origine a donc été adaptée ainsi :

| Élément du document | Adaptation Vercel |
|---|---|
| Docker, `docker-compose` | Non utilisés par Vercel. `docker-compose.yml` = base PostgreSQL **locale** ; `Dockerfile` = repli pour un hébergement souverain (non testé) |
| PostgreSQL + Prisma | Base **externe** (Neon via Marketplace, ou autre). `DATABASE_URL` poolée (PgBouncer, `connection_limit=1`) pour les fonctions ; `DIRECT_URL` directe pour `prisma migrate`. Générateur Prisma avec `binaryTargets = ["native","rhel-openssl-3.0.x"]` ; `postinstall` et `build` exécutent `prisma generate` |
| Redis (cache, débit) | Redis **REST** (Upstash/Marketplace) : compatible serverless, partagé entre instances. Repli mémoire en développement seulement |
| S3 compatible | Pas d'envoi de fichiers dans les fonctions (corps limité à **4,5 Mo** par requête). Envoi direct navigateur → stockage par URL présignée ; pour des pièces d'identité, bucket **privé** (éviter les URL publiques) |
| Auth.js / sessions | Sessions **en base** (révocables), vérifiées côté serveur. Le middleware Edge ne lit que la présence du cookie (pas de Prisma sur Edge) |
| Middleware | `src/middleware.ts` (CSP avec nonce, redirection). Next.js 16 le renomme `proxy.ts` : contenu identique |
| Tâches planifiées | `vercel.json` → `/api/cron/purge` (quotidien, protégé par `CRON_SECRET`) : purge des sessions, expiration des cartes. La fréquence maximale dépend du plan |
| Taille des fonctions | `outputFileTracingExcludes` retire `prisma/data`, `docs`, `tests` du paquet (limite de taille de fonction Vercel) |
| Argon2id | `@node-rs/argon2` (binaires précompilés Linux) déclaré dans `serverExternalPackages` |

## Variables d'environnement (voir `.env.example`)

Définir par environnement Vercel (Production / Preview / Development). **Preview ne doit jamais pointer vers la base de production.**
Secrets : `openssl rand -base64 32`. Ne jamais les committer. La rotation d'`ENCRYPTION_KEY` exige un rechiffrement des secrets TOTP.

## Étapes

1. `git push` puis *Add New Project* dans Vercel.
2. Région des fonctions : `fra1` (fixée dans `vercel.json`). Créer la base **dans la région voisine** (Neon `eu-central-1`) pour la latence.
3. Renseigner les variables.
4. Depuis un poste de confiance : `DATABASE_URL`/`DIRECT_URL` de production → `npx prisma migrate deploy`, puis `SEED_ADMIN_PASSWORD=… npx prisma db seed`.
   (Pas de migration pendant le build : un échec ou une migration destructive ne doit pas être automatique.)
5. Déployer ; vérifier `/login`, les en-têtes (`curl -I`), puis activer la MFA du compte administrateur.
6. Domaine personnalisé + `APP_URL` en HTTPS (utilisé pour l'origine CSRF et les QR des cartes).

## Politique d'usage et conformité

- **Plan** : le plan Hobby est limité à un usage personnel non commercial ; un système institutionnel relève des plans Pro ou Enterprise
  (à confirmer avec Vercel : conditions d'utilisation, politique d'usage acceptable, contrat de traitement des données).
- **Localisation des données** : Vercel et la plupart des bases serverless n'offrent pas de région en Afrique centrale. Des données d'identité
  réelles posent des questions de **souveraineté, de transfert transfrontalier et de base légale** : à trancher avec le juriste et l'autorité
  de protection des données **avant** toute donnée réelle. Le `Dockerfile` permet de basculer vers un hébergement national sans réécriture.
- **Journaux** : la rétention des logs Vercel est limitée ; la traçabilité légale repose sur la table `JournalAudit` (base), pas sur les logs.
- Vérifier les limites en vigueur sur la page « Vercel Functions Limits » (durée, mémoire, taille de corps, taille de paquet) : elles évoluent.
