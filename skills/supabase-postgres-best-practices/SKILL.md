---
name: supabase-postgres-best-practices
description: Expert en optimisation des performances Postgres et bonnes pratiques Supabase. Activer lors de la rédaction, révision ou optimisation de requêtes SQL, conceptions de schémas, ou configurations de base de données, particulièrement avec Supabase et Row-Level Security (RLS).
license: MIT
metadata:
  author: supabase
  version: "1.1.0"
  organization: Supabase
  source: https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices
---

# Supabase Postgres Best Practices

Guide complet d'optimisation des performances Postgres, maintenu par Supabase. Contient des règles classées par priorité d'impact pour guider l'optimisation automatique des requêtes et la conception de schémas.

## Quand appliquer cette compétence

Référencer ces directives lors :
- De l'écriture de requêtes SQL ou de la conception de schémas
- De l'implémentation d'index ou de l'optimisation de requêtes
- De la révision de problèmes de performances de base de données
- De la configuration du pooling de connexions ou de la mise à l'échelle
- De l'optimisation des fonctionnalités spécifiques à Postgres
- Du travail avec Row-Level Security (RLS)

## Catégories de Règles par Priorité

| Priorité | Catégorie | Impact | Préfixe |
|----------|-----------|--------|---------|
| 1 | Performance des Requêtes | CRITIQUE | `query-` |
| 2 | Gestion des Connexions | CRITIQUE | `conn-` |
| 3 | Sécurité & RLS | CRITIQUE | `security-` |
| 4 | Conception de Schéma | ÉLEVÉ | `schema-` |
| 5 | Concurrence & Verrouillage | MOYEN-ÉLEVÉ | `lock-` |
| 6 | Patterns d'Accès aux Données | MOYEN | `data-` |
| 7 | Surveillance & Diagnostics | FAIBLE-MOYEN | `monitor-` |
| 8 | Fonctionnalités Avancées | FAIBLE | `advanced-` |

## Règles CRITIQUES (Priorité 1 & 2)

### Index Manquants (query-missing-indexes)
```sql
-- ❌ Mauvais : Scan séquentiel complet de la table
SELECT * FROM mouvements WHERE boutique_id = $1;

-- ✅ Correct : Index B-Tree sur la colonne de filtrage
CREATE INDEX CONCURRENTLY idx_mouvements_boutique_id
  ON mouvements (boutique_id);
```

### Éviter SELECT * (query-select-star)
```sql
-- ❌ Mauvais : Transfère toutes les colonnes, y compris les données volumineuses
SELECT * FROM produits WHERE boutique_id = $1;

-- ✅ Correct : Sélectionner uniquement les colonnes nécessaires
SELECT id, nom, prix_vente, qty_physique
FROM produits
WHERE boutique_id = $1;
```

### Utiliser .maybeSingle() au lieu de .single() (query-single-vs-maybeSingle)
```typescript
// ❌ Mauvais : Lance une erreur 406 si aucune ligne trouvée
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// ✅ Correct : Retourne null sans erreur si aucune ligne
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle();
```

### Pagination Obligatoire sur les Grandes Tables (query-pagination)
```typescript
// ❌ Mauvais : Charge toute la table en mémoire
const { data } = await supabase
  .from('mouvements')
  .select('*');

// ✅ Correct : Chargement par pages de 50 éléments
const { data } = await supabase
  .from('mouvements')
  .select('id, type, quantite, date_heure')
  .range(0, 49)
  .order('date_heure', { ascending: false });
```

### Utiliser des RPC pour les Calculs Agrégés (query-aggregate-rpc)
```sql
-- ✅ Créer une fonction RPC côté serveur pour les KPI du dashboard
CREATE OR REPLACE FUNCTION get_dashboard_kpis(
  p_boutique_id UUID,
  p_date_debut  TIMESTAMPTZ,
  p_date_fin    TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_ventes', COALESCE(SUM(quantite) FILTER (WHERE type = 'Sortie'), 0),
    'ca_total',     COALESCE(SUM(montant), 0)
  ) INTO v_result
  FROM mouvements
  WHERE boutique_id = p_boutique_id
    AND date_heure BETWEEN p_date_debut AND p_date_fin;

  RETURN v_result;
END;
$$;
```

### RLS : Éviter les Sous-Requêtes Coûteuses (security-rls-performance)
```sql
-- ❌ Mauvais : Sous-requête exécutée pour CHAQUE ligne
CREATE POLICY "users_own_data" ON produits
  FOR SELECT USING (
    boutique_id IN (
      SELECT boutique_id FROM boutique_users WHERE user_id = auth.uid()
    )
  );

-- ✅ Correct : Utiliser les claims JWT (custom claims hook)
CREATE POLICY "users_own_data" ON produits
  FOR SELECT USING (
    boutique_id = ANY(
      (auth.jwt() ->> 'boutique_ids')::UUID[]
    )
  );
```

### Connection Pooling (conn-pooling)
- Utiliser Supavisor (le pooler Supabase) en mode **Transaction** pour les applications serverless
- Ne jamais ouvrir plus de connexions que `max_connections / 2`
- Utiliser `CONCURRENTLY` pour la création d'index en production pour éviter les locks

## Ressources
- https://www.postgresql.org/docs/current/
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
