---
name: typescript-expert
description: Expert TypeScript et JavaScript avec une connaissance approfondie de la programmation au niveau des types, l'optimisation des performances, la gestion des monorepos, les stratégies de migration et les outils modernes. Activer pour les problèmes TypeScript complexes, les migrations JS vers TS, ou la revue de types avancés.
category: framework
risk: critical
source: community
metadata:
  source: https://github.com/sickn33/antigravity-awesome-skills/tree/main/skills/typescript-expert
---

# Expert TypeScript

## Quand invoquer cette compétence
- Résoudre des erreurs TypeScript complexes que les solutions simples ne règlent pas
- Concevoir des types génériques avancés et des types utilitaires
- Migrer du JavaScript vers TypeScript
- Optimiser les performances de compilation TypeScript dans un monorepo
- Configurer `tsconfig.json` pour des besoins de projet spécifiques
- Déboguer des erreurs de type mystérieuses causant des faux positifs ou false negatives
- Implémenter des patterns type-safe avec des APIs et bases de données

## Expertise du Système de Types Avancé

### Patterns de Programmation au Niveau des Types

```typescript
// Types utilitaires personnalisés
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Types conditionnels pour les réponses Supabase
type SupabaseResponse<T> =
  | { data: T; error: null }
  | { data: null; error: Error };

// Type-safe RPC calls
type RpcFunctions = {
  get_dashboard_kpis: {
    Args: { p_boutique_id: string; p_date_debut: string; p_date_fin: string };
    Returns: { total_ventes: number; ca_total: number };
  };
  process_sale_transaction: {
    Args: { p_boutique_id: string; p_produit_id: string; p_quantite: number };
    Returns: { success: boolean; stock_restant: number };
  };
};
```

### Stratégies d'Optimisation des Performances

```typescript
// Utiliser const assertions pour les littéraux
const ROLES = ['owner', 'manager', 'seller', 'viewer'] as const;
type Role = typeof ROLES[number]; // 'owner' | 'manager' | 'seller' | 'viewer'

// Template literal types pour des types dynamiques type-safe
type EventName = `on${Capitalize<string>}`;
type CssProperty = `${string}-${string}`;

// Intersection vs Union — choisir judicieusement
type AdminUser = User & { permissions: string[] };    // Intersection : DOIT avoir les deux
type OwnerOrAdmin = Owner | Admin;                    // Union : peut être l'un ou l'autre
```

### Résolution de Problèmes TypeScript Complexes

```typescript
// Erreur fréquente : "Object is possibly undefined"
// ❌ Mauvais : Optional chaining sans vérification
const nom = produit?.nom?.toUpperCase();

// ✅ Correct : Type guard explicite
function hasProduit(p: Produit | undefined): p is Produit {
  return p !== undefined && p.nom !== undefined;
}
if (hasProduit(produit)) {
  const nom = produit.nom.toUpperCase(); // TypeScript sait que c'est sûr
}

// Erreur fréquente : "Property does not exist on type 'never'"
// Cause : Union type mal construite, l'un des branches est exclue
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function processResult<T>(result: Result<T>) {
  if (result.ok) {
    return result.data;   // TypeScript sait que data existe ici
  } else {
    return result.error;  // TypeScript sait que error existe ici
  }
}
```

### Patterns Modernes de Tooling

```typescript
// tsconfig.json recommandé pour un projet React + Vite
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    // Strict mode complet
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,

    // Chemins absolus
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Intégration Supabase Type-Safe

```typescript
// Générer les types Supabase automatiquement
// supabase gen types typescript --project-id <id> > src/types/database.ts

import type { Database } from './types/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(url, anonKey);

// Maintenant toutes les requêtes sont type-safe !
const { data } = await supabase
  .from('produits')   // Autocomplète les tables
  .select('id, nom, qty_physique')  // Autocomplète les colonnes
  .eq('boutique_id', boutiqueId);
// data est typé automatiquement: Array<Pick<Database['public']['Tables']['produits']['Row'], 'id' | 'nom' | 'qty_physique'>>
```

### Checklist de Revue de Code TypeScript

**Sécurité des Types**
- [ ] Pas d'utilisation de `any` (utiliser `unknown` ou des types génériques)
- [ ] Pas de `as` cast non justifié
- [ ] `noUncheckedIndexedAccess` activé dans tsconfig.json
- [ ] Types nuls gérés explicitement (pas de `!` non nul assertion)

**Meilleures Pratiques**
- [ ] Interfaces pour les objets extensibles, `type` pour les unions/intersections
- [ ] Exports nommés préférés aux exports par défaut
- [ ] Enums remplacés par `as const` + type union
- [ ] Fonctions async typent leurs retours : `Promise<T>`

**Patterns d'Organisation**
- [ ] Types dans `src/types/` ou colocalisés avec leur module
- [ ] Re-export centralisé depuis `src/types/index.ts`
- [ ] Types de base de données générés, jamais écrits manuellement

## Arbre de Décision : Quel outil utiliser ?

```
Besoin de types partagés entre modules ?
├── Oui → Types exportés dans src/types/index.ts
│   ├── Structure complexe → Interface
│   └── Union ou alias → Type
└── Non → Types locaux dans le fichier

Valider des données au runtime ?
├── Formulaires → Zod + zodResolver
├── API responses → Zod ou Valibot
└── Pas de validation nécessaire → Types TypeScript suffisent
```
