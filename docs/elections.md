# Processus électoral — règles implémentées

| Règle (notes CENI) | Mise en œuvre |
|---|---|
| **Espace électeur visible seulement si des scrutins sont ouverts** | `/electeur` renvoie 404 tant qu'aucun scrutin n'est `OUVERT` (vérifié à chaque requête, `force-dynamic`) ; le lien n'apparaît sur `/login` que si un scrutin est ouvert. |
| **La CENI crée les comptes pour toutes les circonscriptions** | Rôle `CENI` (périmètre NATIONAL) : crée circonscriptions de toutes les provinces et comptes `CIRCONSCRIPTION` / `CENTRE_TRAITEMENT` (page *Utilisateurs*). |
| **Chaque circonscription enregistre les candidatures locales, sauf la présidentielle** | `canRegisterCandidature` : `CIRCONSCRIPTION` → législatives de SA circonscription ; `CENI` → présidentielle uniquement. La circonscription vient du compte, jamais de la requête. |
| **La CENI définit les sièges par circonscription** | `PUT /api/scrutins/[id]/sieges` (scrutin planifié) ; un siège minimum en législatives. |
| **Résultats affichés dans chaque circonscription** | Saisie par l'agent de circonscription (scrutin clos), publication par la CENI, affichage public `/resultats` par circonscription. |
| **Candidat : consultation des résultats après le vote** | Compte `CANDIDAT` (créé pour une candidature recevable) → `/mes-resultats`, seulement si scrutin `CLOS` ET résultats publiés. |
| **Centres de traitement : reçoivent toutes les candidatures** | Rôle `CENTRE_TRAITEMENT` (NATIONAL) : lecture de toutes les candidatures, décision de recevabilité. |
| **Aucune candidature double** | Contrainte unique `(scrutinId, citoyenId)` en base + contrôle explicite → 409 `DUPLICATE_CANDIDATURE`, même entre circonscriptions. |
| **La CENI couvre toutes les provinces de la RDC** | Périmètre NATIONAL ; `createCirconscription` vérifie `scopeIncludes` sur la province choisie. |

## Cycle d'un scrutin
`PLANIFIE` (candidatures, sièges) → `OUVERT` (espace électeur visible ; exige ≥ 1 circonscription et ≥ 1 candidature recevable) → `CLOS` (saisie, publication, consultation). Aucun retour en arrière.

## Hors périmètre (volontairement non implémenté)
- **Le vote lui-même** (bulletin, secret du vote, anti-double vote) : conception à part, avec revue de sécurité dédiée.
- **Attribution des sièges** (scrutin proportionnel, quotients, listes) : les résultats sont classés par voix, sans désignation d'élus.
- **Inscription des électeurs par circonscription** : le contrôle `/electeur` rattache un électeur aux circonscriptions de sa province (et de son territoire si renseigné).

## À valider avant tout usage réel
Âges minimaux (`AGE_MINIMUM_CANDIDAT` dans `src/modules/elections/rules.ts`), conditions d'éligibilité complètes, règles de la loi électorale en vigueur.

## Mise à jour d'une base existante
```bash
npx prisma migrate dev --name processus-electoral   # crée les tables et la colonne Affectation.circonscriptionId
npm run db:seed                                      # enregistre les 4 nouveaux rôles (CENI, CENTRE_TRAITEMENT, CIRCONSCRIPTION, CANDIDAT)
```
Comptes de démonstration (`SEED_DEMO=true`) : `ceni.demo`, `ct.demo`, `cs.limete`.
