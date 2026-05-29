---
name: tanstack-query-best-practices
description: Meilleures pratiques TanStack Query (React Query) pour la récupération de données, la mise en cache, les mutations et la gestion de l'état serveur dans les applications React. Activer lors de la construction d'applications React pilotées par des données avec état serveur.
metadata:
  source: https://github.com/DeckardGer/tanstack-agent-skills/tree/main/skills/tanstack-query
---

# TanStack Query (React Query) — Meilleures Pratiques

## Quand appliquer cette compétence
- Implémenter la récupération de données dans des composants React
- Configurer des stratégies de mise en cache et d'invalidation
- Gérer des mutations avec mises à jour optimistes
- Implémenter une pagination infinie ou basée sur des curseurs
- Optimiser les performances de récupération de données
- Remplacer des appels `useEffect` + `useState` pour la gestion des données serveur

## Catégories de Règles par Priorité

| Priorité | Catégorie | Préfixe |
|----------|-----------|---------|
| 1 | Clés de Requêtes | `qk-` |
| 2 | Mise en Cache | `cache-` |
| 3 | Mutations | `mut-` |
| 4 | Gestion d'Erreurs | `err-` |
| 5 | Prérécupération | `pf-` |
| 6 | Requêtes Infinies | `inf-` |
| 7 | Requêtes Parallèles | `parallel-` |
| 8 | Performance | `perf-` |

## Règles Critiques

### Clés de Requêtes Structurées (qk-factory)
```typescript
// ✅ Créer des factories de clés de requêtes pour la cohérence
export const queryKeys = {
  produits: {
    all: ['produits'] as const,
    byBoutique: (boutiqueId: string) =>
      [...queryKeys.produits.all, 'boutique', boutiqueId] as const,
    detail: (id: string) =>
      [...queryKeys.produits.all, 'detail', id] as const,
  },
  dashboard: {
    kpis: (boutiqueId: string, dateDebut: string) =>
      ['dashboard', 'kpis', boutiqueId, dateDebut] as const,
  },
};

// Utilisation
const { data } = useQuery({
  queryKey: queryKeys.produits.byBoutique(boutiqueId),
  queryFn: () => fetchProduits(boutiqueId),
});
```

### Remplacer useEffect par useQuery (cache-no-effect)
```typescript
// ❌ Mauvais : State management manuel avec useEffect
function Dashboard({ boutiqueId }) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis(boutiqueId).then(setKpis).finally(() => setLoading(false));
  }, [boutiqueId]);

  if (loading) return <Spinner />;
  return <KpiCards data={kpis} />;
}

// ✅ Correct : useQuery avec cache automatique
function Dashboard({ boutiqueId }) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.kpis(boutiqueId, today()),
    queryFn: () => supabase.rpc('get_dashboard_kpis', { p_boutique_id: boutiqueId }),
    staleTime: 5 * 60 * 1000,       // Cache 5 minutes
    gcTime: 30 * 60 * 1000,         // Garder en mémoire 30 minutes
  });

  if (isLoading) return <Spinner />;
  return <KpiCards data={kpis} />;
}
```

### Configuration du QueryClient Global (cache-client-config)
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,     // 2 minutes par défaut
      gcTime: 10 * 60 * 1000,       // 10 minutes en mémoire
      retry: 2,                      // 2 tentatives en cas d'échec
      refetchOnWindowFocus: false,   // Éviter les rechargements intempestifs
      refetchOnReconnect: true,      // Recharger au retour de connexion
    },
    mutations: {
      retry: 0,                      // Pas de retry sur les mutations (idempotence)
    },
  },
});

// src/main.jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
    {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
  </QueryClientProvider>
);
```

### Mutations avec Mise à Jour Optimiste (mut-optimistic)
```typescript
// ✅ Mise à jour optimiste : l'UI se met à jour immédiatement
function useUpdateProduit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, changes }) => {
      const { data, error } = await supabase
        .from('produits')
        .update(changes)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // Mise à jour optimiste avant la réponse du serveur
    onMutate: async ({ id, changes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.produits.detail(id) });
      const previous = queryClient.getQueryData(queryKeys.produits.detail(id));

      queryClient.setQueryData(queryKeys.produits.detail(id), (old) => ({
        ...old,
        ...changes,
      }));

      return { previous }; // Snapshot pour rollback
    },

    // Rollback si la mutation échoue
    onError: (err, { id }, context) => {
      queryClient.setQueryData(queryKeys.produits.detail(id), context?.previous);
      toast.error(`Erreur : ${err.message}`);
    },

    // Invalider le cache après succès
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.produits.all });
    },
  });
}
```

### Pagination avec .range() Supabase (pf-pagination)
```typescript
// ✅ Pagination serveur avec TanStack Query
const PAGE_SIZE = 50;

function useProduitsPage(boutiqueId: string, page: number) {
  return useQuery({
    queryKey: [...queryKeys.produits.byBoutique(boutiqueId), 'page', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('produits')
        .select('id, nom, qty_physique, prix_vente', { count: 'exact' })
        .eq('boutique_id', boutiqueId)
        .eq('archived', false)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, totalCount: count ?? 0, page, pageSize: PAGE_SIZE };
    },
    placeholderData: (previousData) => previousData, // Évite le flash pendant pagination
  });
}
```

### Prérécupération au Survol (pf-hover-prefetch)
```typescript
// ✅ Précharger les données au survol pour une navigation instantanée
function ProduitListItem({ produitId, boutiqueId }) {
  const queryClient = useQueryClient();

  const prefetchDetail = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.produits.detail(produitId),
      queryFn: () => fetchProduitDetail(produitId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return (
    <div onMouseEnter={prefetchDetail}>
      <ProduitRow id={produitId} />
    </div>
  );
}
```

### Invalidation Ciblée (cache-targeted-invalidation)
```typescript
// ✅ Invalider uniquement les queries affectées, pas tout le cache
// Après une vente POS :
queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.kpis(boutiqueId, today()) });
queryClient.invalidateQueries({ queryKey: queryKeys.produits.detail(produitId) });
// PAS: queryClient.invalidateQueries() ← invalide tout (trop agressif)
```

## Gestion d'Erreurs Standard
```typescript
// ✅ Composant global d'erreur avec react-error-boundary
import { ErrorBoundary } from 'react-error-boundary';

function ProduitsPage() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <p>Erreur : {error.message}</p>
          <button onClick={resetErrorBoundary}>Réessayer</button>
        </div>
      )}
    >
      <ProduitsTable />
    </ErrorBoundary>
  );
}
```
