---
name: animation-glow-neon-gpu
description: Implémente des effets d'arrière-plan lumineux (neon glow / radial gradient pulsant) haute performance via GPU avec Framer Motion et TailwindCSS, inspirés des patterns Aceternity UI. À utiliser pour créer des halos lumineux qui "respirent" derrière des mockups mobiles ou des sections hero, sans surcharger le CPU.
version: 1.0.0
---

# Animation Glow Neon GPU — Arrière-plans Lumineux Ultra-Premium

Cette compétence guide la création d'effets de lueur néon pulsants (neon glow) optimisés pour le GPU, compatibles avec les appareils mobiles de milieu de gamme (marché africain). Elle s'appuie sur les patterns visuels d'Aceternity UI sans installer de dépendance externe.

## Quand utiliser cette compétence ?
- Quand l'utilisateur demande un "effet de lumière", "halo", "glow" ou "fond lumineux" derrière un élément.
- Quand on veut mettre en valeur un mockup de téléphone ou une section Hero avec un effet premium.
- Quand il faut simuler l'esthétique des sites comme Linear, Stripe ou Moltrack.

## Source & Sécurité

> [!IMPORTANT]
> Aceternity UI **N'A PAS** de package npm installable. Le dépôt `github.com/aceternity/ui` est introuvable (404 vérifié). 
> **Méthode correcte :** Copier le code directement depuis `https://ui.aceternity.com/components/glowing-effect`.
> **Aucune commande `npm install aceternity`** ne doit jamais être exécutée.

## Instructions

### 1. Architecture du composant Glow (Pattern Aceternity)

Créer un fichier `src/components/ui/GlowBackground.jsx` en copiant ce pattern sûr :

```jsx
import { motion } from 'framer-motion';

/**
 * GlowBackground — Halo lumineux pulsant optimisé GPU
 * Pattern inspiré d'Aceternity UI (ui.aceternity.com/components/glowing-effect)
 * NE PAS installer de package externe. Ce composant est autonome.
 */
export const GlowBackground = ({ 
  color = "#22c55e",  // Vert émeraude par défaut (couleur Stokimba)
  size = 600,
  intensity = 0.15,
  className = "" 
}) => (
  <motion.div
    className={`absolute rounded-full pointer-events-none -z-10 ${className}`}
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: "blur(80px)",
      willChange: "transform, opacity", // Force une couche GPU dédiée
    }}
    animate={{
      scale: [1, 1.08, 1],
      opacity: [intensity, intensity * 2.5, intensity],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);
```

### 2. Intégration dans la Hero Section

```jsx
// Dans LandingPage.jsx — Section Hero (lignes ~160-235)
<section className="relative flex flex-col items-center">
  {/* Halo vert derrière le mockup téléphone */}
  <GlowBackground 
    color="#22c55e" 
    size={700} 
    intensity={0.12}
    className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
  />
  {/* Halo bleu secondaire décalé */}
  <GlowBackground 
    color="#3b82f6" 
    size={400} 
    intensity={0.08}
    className="top-20 right-0" 
  />
  {/* ... reste du contenu ... */}
</section>
```

### 3. Règles de Performance (Critique pour l'Afrique de l'Ouest)

Toujours appliquer ces règles pour éviter les saccades sur les appareils Android de milieu de gamme :

- ✅ Utiliser **UNIQUEMENT** `opacity` et `scale` (transform) dans `animate`. Ces propriétés sont gérées par le GPU.
- ❌ **Ne JAMAIS animer** `background`, `width`, `height` ou `filter` dans `animate`. Ces propriétés déclenchent un recalcul CPU coûteux (repaint/reflow).
- ✅ **Toujours** ajouter `willChange: "transform, opacity"` dans le `style` inline.
- ✅ Utiliser `pointer-events-none` pour éviter que le halo n'intercepte les clics utilisateur.
- ✅ Utiliser `-z-10` pour positionner le halo derrière le contenu.

### 4. Variante "Dotted Grid Background" (Fond pointillé lumineux)

Pour créer un fond à points lumineux (effet réseau/maillage) sans dépendance externe :

```css
/* Dans index.css */
.bg-dot-pattern {
  background-image: radial-gradient(circle, rgba(34,197,94,0.15) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

```jsx
<div className="absolute inset-0 bg-dot-pattern -z-10 opacity-50" />
```

## Règles strictes / Bonnes pratiques

- **Sécurité :** Ne jamais `npm install` un package nommé `aceternity` ou similaire. Les patterns sont copy-paste uniquement.
- **Performance :** Limiter à 2-3 halos par section maximum sur la même page.
- **Thème :** En mode sombre (`dark:`), réduire l'`intensity` de 30% pour ne pas "brûler" l'œil sur les écrans OLED.
- **Accessibilité :** Toujours `pointer-events-none` et `aria-hidden="true"` sur ces éléments décoratifs.

## Références Sûres
- Documentation patterns : `https://ui.aceternity.com/components/glowing-effect`
- Documentation Framer Motion animate : `https://motion.dev/docs/react-animation`
