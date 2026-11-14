# Mise en ligne sur Vercel — liste de contrôle

Durée : environ 30 minutes. Prérequis : un compte Vercel **Pro ou Enterprise** (le plan Hobby est réservé à un usage personnel non commercial), un dépôt Git, Node 20.9+ en local.

## 1. Préparer le dépôt
```bash
unzip snid-rdc-v2-nextjs.zip && cd snid-next
npm install                       # génère package-lock.json : à committer
git init && git add -A && git commit -m "SNID-RDC v2" && git push …
```

## 2. Créer la base PostgreSQL (région proche de `fra1`)
Vercel → *Storage / Marketplace* → **Neon** (région `eu-central-1`) ou autre PostgreSQL. Relever **deux** URL :
- `DATABASE_URL` : connexion **poolée** (hôte contenant `-pooler`, ou `?pgbouncer=true&connection_limit=1`) ;
- `DIRECT_URL` : connexion **directe**.

Pour la limitation de débit : *Marketplace* → **Upstash Redis** → variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.

## 3. Variables d'environnement (Vercel → Settings → Environment Variables → Production)
```bash
npm run secrets                   # affiche ENCRYPTION_KEY, SIGNING_SECRET, CRON_SECRET
```
Ajouter aussi : `DATABASE_URL`, `DIRECT_URL`, `APP_URL` (https://votre-domaine), `MFA_ENFORCE=true`.
**Preview** : utiliser une base DIFFÉRENTE de la production.

## 4. Contrôler la configuration
```bash
vercel env pull .env.production.local --environment=production
npm run preflight -- --prod       # OK / ATT / KO, sans afficher les valeurs
```

## 5. Créer le schéma et le compte administrateur (depuis votre poste, base de production)
```bash
npm run db:deploy                 # applique les migrations (ou « db push » la toute première fois)
SEED_ADMIN_PASSWORD='…12 caractères minimum…' npm run db:seed
```
Pour une démonstration **uniquement** (jamais avec de vraies données) : ajouter `SEED_DEMO=true SEED_DEMO_PASSWORD='…'`.
Puis, en local : `npx prisma migrate dev --name init` et committer `prisma/migrations` (historique des changements de schéma).

## 6. Déployer et vérifier
Importer le projet dans Vercel (Next.js détecté) puis déployer. Vérifier :
1. `https://votre-domaine/api/health` → `{"status":"ok"}` ;
2. `https://votre-domaine/login` : connexion avec `n.kasongo` (ou `SEED_ADMIN_USERNAME`), changement du mot de passe temporaire, activation de la MFA ;
3. `curl -I https://votre-domaine/login` : présence de `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy` ;
4. *Settings → Cron Jobs* : la tâche `/api/cron/purge` est listée.

## 6 bis. Processus électoral
1. Connectez-vous en administrateur et créez le compte **CENI** (*Utilisateurs*), puis activez sa MFA.
2. La CENI crée les circonscriptions (*Circonscriptions*), les comptes d'agents de circonscription et de centre de traitement, puis un scrutin et ses sièges.
3. Contrôle : `https://votre-domaine/electeur` doit répondre **404** tant qu'aucun scrutin n'est ouvert ; `/resultats` est public.
4. N'activez jamais `SEED_DEMO` en production (le seed le refuse et `npm run preflight -- --prod` le signale).
5. Base existante : `npx prisma migrate dev --name processus-electoral` en local (committer `prisma/migrations`), puis `npm run db:deploy` et `npm run db:seed` (rôles).

## 7. Avant des données réelles
Validation juridique, analyse d'impact, revue de sécurité, sauvegardes testées, question de l'hébergement des données (voir `docs/vercel/deploiement.md` et `docs/security/exigences.md`).

## En cas d'échec du premier build
Envoyer le journal de build : les ajustements attendus sont mineurs (versions de paquets, types Prisma/Zod). Le code n'a pas pu être compilé dans l'environnement où il a été écrit : lancez `npm install && npm run typecheck && npm run lint && npm test` AVANT le premier déploiement.
