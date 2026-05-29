---
name: postgres-best-practices
description: "Optimisation experte des performances Postgres et bonnes pratiques Supabase. Utilisée pour concevoir la BDD, écrire du SQL, et configurer la sécurité (RLS)."
version: 1.0.0
---

# Bonnes Pratiques Supabase / Postgres

Ce guide expert oriente l'agent sur l'optimisation des performances, de la sécurité et du schéma relationnel de PostgreSQL, spécifiquement au sein de l'écosystème Supabase.

## Quand utiliser cette compétence ?
- Lors de l'écriture ou la modification de requêtes SQL (spécificités Postgres).
- Lors de la conception ou modification du schéma de la base de données.
- Pour identifier et corriger les goulots d'étranglement de performance.
- Pour la mise en place de la sécurité au niveau des lignes (Row-Level Security - RLS).

## Instructions d'Application
Lorsque vous interagissez avec la base de données Supabase de l'utilisateur ou générez du code SQL, suivez impérativement ces règles :

1. **Performances des requêtes (CRITIQUE)**
   - Vérifiez toujours la présence d'index adaptés (B-Tree, GIN, etc.) pour les colonnes fortement sollicitées par `WHERE`, `JOIN` ou `ORDER BY`.
   - Utilisez des outils d'analyse (`EXPLAIN ANALYZE`) si disponible pour valider la complexité.

2. **Sécurité et RLS (CRITIQUE)**
   - Validez que chaque table publique permettant la lecture/écriture par les clients possède des règles RLS (Row-Level Security) actives.
   - Ne créez aucune règle RLS autorisant des opérations non vérifiées (ex: vérifiez systématiquement `auth.uid()`).

3. **Conception de schéma (ÉLEVÉ)**
   - Favorisez des contraintes d'intégrité référentielle fortes (clés étrangères).
   - Veillez à structurer intelligemment les types (utilisation de `UUID`, `timestamptz`, `jsonb`).

4. **Utilisation des outils MCP Base de données**
   - L'agent **DOIT** utiliser les capacités MCP (comme l'exploration de bases de données, listes de tables, etc.) pour analyser le schéma *réel* en direct, plutôt que de deviner.
   - Proposez toujours des scripts de migration sûrs (sans pertes de données).

## Bonnes Pratiques Spécifiques Supabase
- Pour les Edge Functions, privilégiez le client Supabase `createClient` standard et mettez en œuvre une gestion saine des connexions.
