# Architecture

```
Navigateur ─▶ Middleware (CSP, présence du cookie)
            ─▶ Pages (Server Components) ─┐
            ─▶ Route Handlers /api ───────┴─▶ withApi : CSRF · session en base · permission · débit · erreurs
                                              ─▶ services (assertPermission + périmètre) ─▶ repositories ─▶ Prisma ─▶ PostgreSQL
```

## Décisions de conception
- **Deux contrôles à chaque opération** : RBAC (`can(role, permission)`) puis périmètre (`scopeIncludes/scopeWhere`). Le périmètre est un filtre de base de données (`where`), pas un test d'interface. Le filtre du périmètre est toujours placé **en dernier** dans les requêtes pour écraser tout paramètre fourni par l'utilisateur.
- **Géographie dénormalisée** sur `Citoyen` et `Declaration` (province, commune, quartier, rue) : filtre simple, indexable, vérifiable.
- **NIU** = identifiant à vie, `CD-pp-cc-qq-rrrr-nnnnn`. Compteur atomique par préfixe (`NiuSequence`) + contrainte `UNIQUE`. Une arrivée dans une autre rue met à jour le rattachement mais **ne change pas** le NIU.
- **Enregistrement contrôlé** : `POST /api/citoyens` dépose une demande (202) ; le citoyen n'existe qu'après la chaîne de validation, dans la même transaction que l'attribution du NIU et l'écriture du journal.
- **Chaîne de validation** (`declarations/workflow.ts`) : un niveau sans titulaire actif dans le périmètre est ignoré ; chaque rôle n'approuve qu'une fois (`UNIQUE(declarationId, roleCode)`) et seulement à son tour.
- **Gouverneur** : rôle `GOUVERNEUR`, périmètre `PROVINCE`, lecture seule ; un seul gouverneur actif par province (et un bourgmestre par commune).
- **Biométrie** : `ModeBiometrie.SIMULATION` ne stocke aucune donnée ; le mode `REEL` est refusé tant qu'il n'est pas activé et intégré.

## Migration de la démonstration (section 10 du document)
| Démonstration | Cible | État |
|---|---|---|
| Comptes de démonstration | Authentification réelle | Fait |
| Habitants fictifs | Enregistrement réel contrôlé | Fait (workflow) ; jeu fictif marqué `demo` |
| NIU simulé | Générateur sécurisé, unicité garantie | Fait |
| Signature simulée | Signature autorisée et traçable | Partiel : signataire = chef de rue tracé sur la carte ; image de signature à venir |
| Biométrie simulée | Équipements réels | Séparée ; intégration à faire |
| Cartes imprimables | Service de délivrance contrôlé | Fait (service communal, renouvellement, révocation au décès) |
| Données navigateur | PostgreSQL | Fait |
| Rôles existants | RBAC + restrictions territoriales | Fait ; rôles institutionnels (DGM, CENI, FP, entreprises) à porter |

## Fichiers « purs »
`scope.ts`, `permissions.ts`, `niu.ts`, `workflow.ts`, `lib/{totp,encryption,signing,password-policy,csrf,dates}.ts` n'ont aucune dépendance de framework et
sont testés directement sous Node/Vitest (imports relatifs en `.ts`).
