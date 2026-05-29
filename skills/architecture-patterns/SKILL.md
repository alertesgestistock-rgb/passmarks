---
name: architecture-patterns
description: Maîtriser les patterns d'architecture backend éprouvés incluant Clean Architecture, Architecture Hexagonale et Domain-Driven Design pour construire des systèmes maintenables, testables et scalables. Activer pour la conception de nouveaux systèmes, la refactorisation d'applications monolithiques, ou l'établissement de standards d'architecture.
risk: none
source: community
metadata:
  source: https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills/architecture-patterns
---

# Patterns d'Architecture

Maîtriser les patterns d'architecture backend éprouvés pour construire des systèmes maintenables, testables et scalables.

## Quand utiliser cette compétence
- Concevoir de nouveaux systèmes backend depuis zéro
- Refactoriser des applications monolithiques pour améliorer la maintenabilité
- Établir des standards d'architecture pour votre équipe
- Migrer d'architectures trop couplées vers des architectures découplées
- Implémenter les principes du Domain-Driven Design
- Créer des bases de code testables et mockables
- Planifier la décomposition en microservices

## Ne pas utiliser cette compétence quand
- On fait seulement de petites refactorisations localisées
- Le système est principalement frontend sans changements d'architecture backend
- On a besoin de détails d'implémentation sans conception architecturale

## Instructions
1. Clarifier les frontières de domaine, les contraintes et les cibles de scalabilité
2. Sélectionner un pattern d'architecture adapté à la complexité du domaine
3. Définir les frontières de modules, les interfaces et les règles de dépendances
4. Fournir des étapes de migration et des vérifications de validation
5. Pour les workflows critiques (paiements, traitements multi-étapes), utiliser l'exécution durable

## Patterns d'Architecture

### Clean Architecture (pour Stokimba)

```
src/
├── domain/          # Règles métier pures (pas de dépendances externes)
│   ├── entities/    # Entités: Produit, Boutique, Mouvement
│   ├── usecases/    # Cas d'utilisation: ProcessSale, UpdateStock
│   └── repositories/ # Interfaces abstraites (pas d'implémentation)
├── application/     # Orchestration des cas d'utilisation
│   ├── services/    # Services applicatifs
│   └── dtos/        # Data Transfer Objects
├── infrastructure/  # Implémentations concrètes (Supabase, API)
│   ├── supabase/    # Implémentation des repositories Supabase
│   └── api/         # Adapters API
└── presentation/    # UI React
    ├── components/
    ├── hooks/
    └── pages/
```

### Pattern Repository avec Supabase
```typescript
// domain/repositories/IProduitRepository.ts
export interface IProduitRepository {
  findByBoutique(boutiqueId: string): Promise<Produit[]>;
  findById(id: string): Promise<Produit | null>;
  update(id: string, data: Partial<Produit>): Promise<Produit>;
  delete(id: string): Promise<void>;
}

// infrastructure/supabase/SupabaseProduitRepository.ts
export class SupabaseProduitRepository implements IProduitRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByBoutique(boutiqueId: string): Promise<Produit[]> {
    const { data, error } = await this.supabase
      .from('produits')
      .select('id, nom, qty_physique, prix_vente')
      .eq('boutique_id', boutiqueId)
      .eq('archived', false);

    if (error) throw new RepositoryError(error.message);
    return data.map(toProduitEntity);
  }
}
```

### Pattern CQRS Léger (Command/Query Separation)
```typescript
// Queries : Lecture pure (pas de side effects)
// hooks/queries/useProduits.ts
export function useProduits(boutiqueId: string) {
  return useQuery({ /* ... */ });
}

// Commands : Écriture avec side effects
// hooks/commands/useProcessSale.ts
export function useProcessSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleData: SaleData) =>
      supabase.rpc('process_sale_transaction', saleData),
    onSuccess: ({ data }) => {
      // Invalider les queries affectées
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['produits', data.boutique_id] });
    }
  });
}
```

### Event-Driven avec Supabase Realtime
```typescript
// Écouter les changements en temps réel (pattern Observer)
function useRealtimeInventaire(boutiqueId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`inventaire-${boutiqueId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'produits',
        filter: `boutique_id=eq.${boutiqueId}`,
      }, (payload) => {
        // Mise à jour ciblée du cache, pas de rechargement complet
        queryClient.setQueryData(
          ['produits', boutiqueId],
          (old: Produit[] | undefined) =>
            old?.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p) ?? []
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [boutiqueId, queryClient]);
}
```

### Pattern Saga pour Processus Longs
```typescript
// Saga : Gestion des compensations en cas d'échec
class SaleProcessingSaga {
  async execute(saleRequest: SaleRequest) {
    const steps: CompensableStep[] = [
      {
        execute: () => this.reserveStock(saleRequest),
        compensate: () => this.releaseStock(saleRequest),
      },
      {
        execute: () => this.createDocument(saleRequest),
        compensate: () => this.deleteDocument(saleRequest),
      },
      {
        execute: () => this.notifyStakeholders(saleRequest),
        compensate: () => Promise.resolve(), // Notifications non annulables
      },
    ];

    const executed: CompensableStep[] = [];
    try {
      for (const step of steps) {
        await step.execute();
        executed.push(step);
      }
    } catch (error) {
      // Compenser en ordre inverse
      for (const step of executed.reverse()) {
        await step.compensate().catch(console.error);
      }
      throw error;
    }
  }
}
```

## Décisions Architecturales Typiques

| Besoin | Pattern Recommandé |
|--------|-------------------|
| Lecture complexe de données | Query Function + useQuery |
| Écriture avec side effects | Command + useMutation |
| Notifications temps réel | Realtime Supabase + QueryClient |
| Opérations multi-étapes | Transaction RPC ou Saga |
| Isolation des données | RLS + JWT Claims |
| Calculs lourds | Stored Procedure RPC |

## Ressources
- `resources/implementation-playbook.md` pour les patterns détaillés, checklists et templates
