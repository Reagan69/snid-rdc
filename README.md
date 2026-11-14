# SNID-RDC v2 — Next.js · TypeScript · PostgreSQL · Prisma (déployable sur Vercel)

Réécriture de la démonstration SNID-RDC (HTML/JS, données dans le navigateur) selon le document
« Architecture professionnelle du SNID-RDC avec Next.js » : séparation interface / règles métier / données / services
techniques, contrôle d'accès par **rôle (RBAC) ET par périmètre territorial**, journal d'audit, sessions révocables.

> Les données de démonstration sont **fictives** (marquées `demo`). Avant tout usage réel : validation juridique, analyse
> d'impact sur la protection des données, revue de sécurité indépendante (voir `docs/security/exigences.md`).

## Ce qui est livré

| Domaine | Contenu |
|---|---|
| Données | Schéma Prisma complet (administration territoriale, utilisateurs, rôles, affectations, sessions, citoyens, NIU, cartes, biométrie, déclarations, documents, audit) ; géographie de la démo importée : 26 provinces, 291 communes/territoires, 1 102 quartiers/secteurs |
| Sécurité | Argon2id, sessions opaques révocables (SHA-256 en base), cookie `__Host-`, verrouillage de compte, MFA TOTP (RFC 6238), AES-256-GCM, CSP avec nonce, HSTS, CSRF (origine), limitation de débit (Redis REST), journal d'audit en ajout seul |
| Règles métier | NIU `CD-pp-cc-qq-rrrr-nnnnn` attribué de façon **atomique** ; chaîne de validation chef de quartier → chef de bureau → bourgmestre → ONIP ; détection d'homonymes ; cartes avec QR signé (HMAC) et vérification publique minimale ; biométrie **simulée** strictement séparée du réel |
| Rôles | Administrateur ONIP, Auditeur, **Gouverneur de province** (lecture seule, province), Bourgmestre, Chef de bureau, Service communal, Chef de quartier, Chef de rue — création de profils (dont les 26 gouverneurs) par l'administrateur |
| API | 24 routes (`docs/api/endpoints.md`) : validation Zod, authentification, permission, limitation de débit, journalisation |
| Interface | Connexion, tableau de bord, citoyens, nouvelle identification, vérification de NIU, déclarations (+ décisions), cartes (+ QR), utilisateurs, gouverneurs, administration territoriale, rapports, audit, mon compte (mot de passe, MFA) |

## Vérifications effectuées (hors ligne) — et ce qui ne l'a PAS été

Faites : 44 tests unitaires (périmètre, RBAC, NIU, chaîne de validation, AES-GCM, signature, TOTP avec les vecteurs officiels de la RFC 6238, CSRF,
politique de mot de passe, règles d'architecture) ; analyse syntaxique des 114 fichiers TypeScript ; vérification de types stricte de l'ensemble du code
avec des substituts pour les paquets absents.

**Non faites** (pas d'accès réseau pour installer les dépendances) : `npm install`, `next build`, `prisma validate` / `migrate`, exécution contre une
vraie base, rendu des pages, déploiement Vercel. Attendez-vous à de petits ajustements au premier `npm run build` (versions de paquets, typage Prisma/Zod
réels). Le schéma doit être validé par `npx prisma validate`, puis la migration initiale générée (voir ci-dessous).

## Processus électoral
Module CENI : scrutins, circonscriptions et sièges, candidatures (blocage des doublons), résultats par circonscription, espace électeur visible uniquement pendant un scrutin ouvert. Détail et limites : `docs/elections.md`. Une base existante exige `prisma migrate` puis `npm run db:seed` (nouveaux rôles).

## Démarrage local

```bash
npm install
cp .env.example .env            # renseigner les secrets : openssl rand -base64 32
docker compose up -d db         # PostgreSQL local
npx prisma migrate dev --name init   # génère et applique la migration initiale (à COMMITER dans prisma/migrations)
SEED_ADMIN_PASSWORD='…12 car. min…' SEED_DEMO=true SEED_DEMO_PASSWORD='…' npm run db:seed
npm run dev                     # http://localhost:3000
npm test && npm run typecheck && npm run lint
```
Comptes de démonstration (mot de passe = `SEED_DEMO_PASSWORD`, à changer à la première connexion) : `n.kasongo` (admin, mot de passe `SEED_ADMIN_PASSWORD`),
`a.lukusa`, `gv.<province>` (26), `b.limete`, `s.tshala`, `sc.limete`, `cq.limete`, `cr.limete`.

## Déploiement sur Vercel

**Liste de contrôle pas à pas : `DEPLOIEMENT.md`** (scripts : `npm run secrets`, `npm run preflight`, `npm run db:deploy`).

Guide complet et contraintes : **`docs/vercel/deploiement.md`**. Résumé :

1. Importer le dépôt Git dans Vercel (Next.js détecté ; `vercel.json` fixe la région `fra1` et la tâche planifiée).
2. Base PostgreSQL **dans la même région** (ex. Neon `eu-central-1` via Vercel Marketplace) : `DATABASE_URL` = connexion **poolée**, `DIRECT_URL` = connexion directe.
3. Redis REST (Upstash via Marketplace) pour la limitation de débit : `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
4. Variables : `APP_URL`, `ENCRYPTION_KEY`, `SIGNING_SECRET`, `CRON_SECRET`, `MFA_ENFORCE=true`.
5. Migrations et seed lancés **depuis un poste de confiance** avec la `DIRECT_URL` de production (jamais pendant le build).
6. Environnement *Preview* : base **distincte** de la production.
7. Plan **Pro ou Enterprise** : le plan Hobby est réservé à un usage personnel non commercial.

## Structure

```
prisma/        schema.prisma · seed.ts · data/geo.json (·migrations/ à générer)
src/app/       (public) login, vérification QR · (dashboard) pages · api/ routes
src/modules/   citizens · niu · declarations · cards · biometrics · geography · users · roles · audit · reports
               (schemas/ services/ repositories/ ; fichiers *purs* testables sous Node : scope.ts, permissions.ts, niu.ts, workflow.ts)
src/lib/       prisma · auth · session · http (withApi) · password · encryption · totp · signing · rate-limit · csrf · logger
src/server/    policies/guards.ts (RBAC + périmètre)
src/components ui · navigation · layout · forms
tests/         unit (Vitest) · e2e (Playwright) · integration (à compléter avec une base de test)
docs/          architecture · api · security · vercel
```
Règle d'or (testée automatiquement) : **aucun composant React n'accède à Prisma** ; tout passe par les services, qui appliquent
`assertPermission` + périmètre territorial.

## Limites connues et suite recommandée

- Pas encore : import des **pièces justificatives** (le modèle `Document` existe ; Vercel limite le corps des requêtes à 4,5 Mo → envoi direct vers un stockage privé S3-compatible par URL présignée), signatures manuscrites, biométrie réelle, rôles institutionnels de la démo (DGM, CENI, Fonction publique, entreprises).
- Tests d'intégration (base PostgreSQL de test) et e2e complets à ajouter ; la CI fournie exécute lint, types et tests unitaires.
- Sauvegardes chiffrées et exercices de restauration, procédure d'incident, hébergement des données réelles (souveraineté) : voir `docs/security/exigences.md`.
