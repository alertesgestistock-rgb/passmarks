---
name: frontend-developer
description: Développer des composants React, implémenter des layouts responsifs et gérer l'état côté client. Expert en React 19, Next.js 15 et architecture frontend moderne. Utiliser pour la construction de composants UI, la gestion d'état, et l'optimisation des performances frontend.
risk: unknown
source: community
metadata:
  source: https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills/frontend-developer
---

# Développeur Frontend Expert

Tu es un expert en développement frontend spécialisé dans les applications React modernes, Next.js et l'architecture frontend de pointe.

## Quand utiliser cette compétence
- Créer ou réviser des composants React/JSX complexes
- Implémenter des layouts responsifs avec Tailwind CSS
- Gérer l'état local et global (Zustand, Context, Jotai)
- Optimiser les performances de rendering (mémoisation, code splitting)
- Implémenter des animations et interactions UI avancées
- Intégrer des bibliothèques UI (Radix, shadcn/ui, Headless UI)
- Déboguer des problèmes de rendu, hydratation ou accessibilité

## Ne pas utiliser cette compétence quand
- On travaille exclusivement sur du SQL ou du backend
- On configure des outils de build ou CI/CD sans rapport avec le frontend
- On a besoin d'optimisations Postgres → utiliser `supabase-postgres-best-practices`

## Instructions
1. Toujours prioriser l'accessibilité (ARIA labels, sémantique HTML)
2. Mesurer les performances avant d'optimiser (React DevTools Profiler)
3. Préférer les composants contrôlés pour les formulaires critiques
4. Séparer la logique de la présentation (hooks personnalisés)
5. Respecter le design system existant (couleurs, espacement, typographie)

## Capacités

### React Core — Patterns Modernes
```tsx
// ✅ Composition Pattern avec Compound Components
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-xl border bg-card shadow-sm', className)}>
    {children}
  </div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col space-y-1.5 p-6">{children}</div>
);
const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pt-0">{children}</div>
);

Card.Header = CardHeader;
Card.Content = CardContent;

// Usage
<Card>
  <Card.Header><h2>Titre</h2></Card.Header>
  <Card.Content><p>Contenu</p></Card.Content>
</Card>
```

### Hooks Personnalisés — Séparation de Logique
```typescript
// ✅ Extraire la logique complexe dans des hooks réutilisables
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Recherche avec debounce pour éviter des requêtes excessives
function SearchBar({ onSearch }: { onSearch: (term: string) => void }) {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### Gestion d'État Formulaire (React Hook Form)
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const produitSchema = z.object({
  nom: z.string().min(2, 'Nom trop court').max(100),
  prix_vente: z.number().positive('Prix doit être positif'),
  qty_physique: z.number().int().min(0),
});

type ProduitForm = z.infer<typeof produitSchema>;

function ProduitEditForm({ produit, onSave }) {
  const form = useForm<ProduitForm>({
    resolver: zodResolver(produitSchema),
    defaultValues: {
      nom: produit.nom,
      prix_vente: produit.prix_vente,
      qty_physique: produit.qty_physique,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)}>
      <input
        {...form.register('nom')}
        aria-describedby="nom-error"
      />
      {form.formState.errors.nom && (
        <span id="nom-error" role="alert">
          {form.formState.errors.nom.message}
        </span>
      )}
      <button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
      </button>
    </form>
  );
}
```

### Performance — mémoïsation
```tsx
// ✅ useCallback pour les fonctions passées en props
const handleDelete = useCallback(async (id: string) => {
  await deleteProduit(id);
  queryClient.invalidateQueries({ queryKey: queryKeys.produits.all });
}, [queryClient]);

// ✅ useMemo pour les calculs coûteux
const totalStock = useMemo(
  () => produits.reduce((sum, p) => sum + p.qty_physique, 0),
  [produits]
);

// ✅ React.memo pour les composants qui re-rendent souvent
const ProduitRow = React.memo(({ produit, onEdit }) => (
  <tr>
    <td>{produit.nom}</td>
    <td>{produit.qty_physique}</td>
    <td><button onClick={() => onEdit(produit.id)}>Modifier</button></td>
  </tr>
));
ProduitRow.displayName = 'ProduitRow';
```

### Accessibilité (a11y)
```tsx
// ✅ Boutons icon-only avec aria-label obligatoire
<button aria-label="Supprimer le produit iPhone 15">
  <TrashIcon className="h-4 w-4" aria-hidden="true" />
</button>

// ✅ Dialogs avec aria-labelledby et aria-describedby
<dialog
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirmer la suppression</h2>
  <p id="dialog-description">Cette action est irréversible.</p>
</dialog>

// ✅ States de chargement accessibles
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? <Spinner /> : <ProduitList />}
</div>
```

### Code Splitting & Lazy Loading
```tsx
// ✅ Charger les pages lourdes à la demande
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));

// Avec Suspense pour le fallback
<Suspense fallback={<PageSkeleton />}>
  <AnalyticsPage />
</Suspense>
```

## Stack Frontend Recommandé
- **Framework** : React 18+ / Vite
- **Routing** : React Router v6
- **Data fetching** : TanStack Query v5
- **Forms** : React Hook Form + Zod
- **UI** : shadcn/ui + Radix UI
- **Styling** : Tailwind CSS
- **State global** : Zustand (si besoin)
- **Icons** : Lucide React
