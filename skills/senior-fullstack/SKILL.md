---
name: senior-fullstack
description: Boîte à outils complète pour le développement fullstack senior avec des outils modernes et des meilleures pratiques. Comprend l'échafaudage de projets, l'analyse de qualité de code, et les patterns d'architecture. Activer pour les tâches fullstack complexes nécessitant une expertise transversale entre frontend et backend.
risk: critical
source: community
metadata:
  source: https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills/senior-fullstack
---

# Senior Fullstack

Boîte à outils complète pour le développement fullstack senior avec des outils modernes et des meilleures pratiques.

## Quand utiliser cette compétence
- Concevoir une nouvelle fonctionnalité qui touche à la fois le frontend et le backend
- Revue d'architecture end-to-end d'une fonctionnalité complexe
- Optimiser le flow entier (BDD → API → UI) d'un workflow
- Implémenter un système complet en partant de zéro (auth, CRUD, notifications)
- Décider des compromis entre approches techniques couvrant plusieurs couches

## Ne pas utiliser cette compétence quand
- On travaille sur une couche isolée (seulement SQL, seulement UI)
- On a besoin d'une expertise très spécialisée → utiliser database-architect, security-auditor, etc.

## Instructions
1. Analyser le besoin de bout en bout avant de commencer (BDD → API → UI → UX)
2. Concevoir les interfaces et contrats AVANT l'implémentation
3. Prioriser la cohérence entre les couches (nommage, types partagés)
4. Implémenter les tests à chaque couche (unit, integration, e2e)
5. Optimiser les performances globales, pas par couche isolément

## Stack Technologique

**Langages:** TypeScript, JavaScript, SQL
**Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui
**Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
**Data Fetching:** TanStack Query v5
**Forms:** React Hook Form + Zod
**Database:** PostgreSQL avec RLS
**DevOps:** GitHub Actions, Vercel/Netlify

## Patterns d'Architecture Fullstack

### Pattern 1 : Feature Slice (Organisation par Fonctionnalité)
```
src/features/
├── produits/
│   ├── api/
│   │   ├── getProduits.ts      # Requêtes Supabase
│   │   └── updateProduit.ts    # Mutations Supabase
│   ├── components/
│   │   ├── ProduitTable.tsx
│   │   └── ProduitEditForm.tsx
│   ├── hooks/
│   │   ├── useProduits.ts      # useQuery wrapper
│   │   └── useUpdateProduit.ts # useMutation wrapper
│   └── types.ts                # Types spécifiques à la feature
```

### Pattern 2 : Couche d'Accès aux Données Typée
```typescript
// src/features/produits/api/getProduits.ts
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Produit = Database['public']['Tables']['produits']['Row'];

export async function getProduits(boutiqueId: string): Promise<Produit[]> {
  const { data, error } = await supabase
    .from('produits')
    .select('id, nom, qty_physique, prix_vente, categorie_id')
    .eq('boutique_id', boutiqueId)
    .eq('archived', false)
    .order('nom');

  if (error) throw new Error(error.message);
  return data;
}
```

### Pattern 3 : Hook de Données avec Cache
```typescript
// src/features/produits/hooks/useProduits.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProduits, updateProduit } from '../api';

export function useProduits(boutiqueId: string) {
  return useQuery({
    queryKey: ['produits', boutiqueId],
    queryFn: () => getProduits(boutiqueId),
    enabled: !!boutiqueId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useUpdateProduit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduit,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['produits', variables.boutiqueId] });
    },
  });
}
```

### Pattern 4 : Composant Couplé à ses Données
```tsx
// src/features/produits/components/ProduitTable.tsx
import { useProduits } from '../hooks/useProduits';

export function ProduitTable({ boutiqueId }: { boutiqueId: string }) {
  const { data: produits, isLoading, error } = useProduits(boutiqueId);

  if (isLoading) return <TableSkeleton rows={10} />;
  if (error) return <ErrorState message={error.message} />;
  if (!produits?.length) return <EmptyState />;

  return (
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Stock</th>
          <th>Prix</th>
        </tr>
      </thead>
      <tbody>
        {produits.map((p) => (
          <ProduitRow key={p.id} produit={p} />
        ))}
      </tbody>
    </table>
  );
}
```

## Checklist de Qualité Fullstack
- [ ] Types partagés entre frontend et backend (types générés Supabase)
- [ ] Pas de logique métier dans les composants React (extraire en hooks)
- [ ] Toutes les requêtes passent par une couche d'accès aux données
- [ ] Gestion d'erreur à chaque niveau (BDD → API → UI)
- [ ] Variables d'environnement pour toutes les configurations sensibles
- [ ] Logs d'audit pour toutes les opérations importantes
- [ ] RLS activé sur toutes les tables Supabase
