---
name: carte-afrique-faisceaux-svg
description: Crée un composant React interactif affichant la carte de l'Afrique (via @react-map/africa depuis github.com/react-map/react-map) avec des faisceaux lumineux animés entre les villes (via AnimatedBeam de MagicUI depuis github.com/magicuidesign/magicui). Animation déclenchée au défilement via Framer Motion whileInView. Idéal pour illustrer la couverture d'un SaaS sur le continent africain.
version: 1.0.0
---

# Carte Afrique avec Faisceaux Lumineux SVG — "L'Écosystème Continental"

Cette compétence guide la création d'un composant React affichant la carte de l'Afrique avec des lignes lumineuses animées reliant les grandes métropoles économiques. C'est l'animation signature pour un SaaS ciblant l'Afrique de l'Ouest.

## Quand utiliser cette compétence ?
- Quand l'utilisateur veut montrer la couverture géographique de son application sur l'Afrique.
- Quand on veut créer une section "Trust" montrant que le produit est "fait pour l'Afrique".
- Pour illustrer des connexions réseau, flux financiers, ou livraisons entre villes africaines.

## Sources & Sécurité (VÉRIFIÉES)

> [!IMPORTANT]
> Les deux dépôts suivants ont été **vérifiés manuellement** le 20 Avril 2026 et sont sains :
> - ✅ `https://github.com/react-map/react-map` (package npm: `@react-map/africa`)
> - ✅ `https://github.com/magicuidesign/magicui` (composant: `AnimatedBeam`)
>
> **NE PAS** cloner ces dépôts. Utiliser exclusivement les packages npm officiels.

## Instructions

### Étape 1 : Installation des dépendances sûres

```bash
# Installation du package de carte Afrique (vérifié sain)
npm install @react-map/africa

# MagicUI utilise uniquement framer-motion (déjà présent dans le projet)
# Le composant AnimatedBeam est copié manuellement depuis magicui.design
```

### Étape 2 : Créer le composant AnimatedBeam (Copy-paste depuis MagicUI)

Créer `src/components/ui/AnimatedBeam.jsx` en copiant le code depuis :
`https://magicui.design/docs/components/animated-beam`

Le composant expose ces props clés :
```typescript
// Props essentielles du composant AnimatedBeam
{
  fromRef: RefObject,   // Point de départ (ex: Hub Abidjan)
  toRef: RefObject,     // Point d'arrivée (ex: Hub Yaoundé)
  curvature: number,    // Courbe de la ligne (-50 à 50)
  duration: number,     // Vitesse du flux de lumière
}
```

### Étape 3 : Créer le composant Carte

Créer `src/components/landing/AfriqueReseauMap.jsx` :

```jsx
import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Africa } from '@react-map/africa';
import { AnimatedBeam } from '@/components/ui/AnimatedBeam';

const VILLES = {
  abidjan:  { top: '52%', left: '22%', label: 'Abidjan' },
  douala:   { top: '55%', left: '42%', label: 'Douala' },
  dakar:    { top: '42%', left: '10%', label: 'Dakar' },
  lagos:    { top: '53%', left: '40%', label: 'Lagos' },
  yaounde:  { top: '57%', left: '44%', label: 'Yaoundé' },
  accra:    { top: '52%', left: '30%', label: 'Accra' },
};

export const AfriqueReseauMap = () => {
  const containerRef = useRef(null);
  const hubRef = useRef(null);       // Centre névralgique (Abidjan)
  const dkrRef = useRef(null);
  const dlaRef = useRef(null);
  const lgsRef = useRef(null);
  const accRef = useRef(null);

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative py-20 px-4 text-center"
    >
      <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
        Votre commerce,{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
          à l'échelle de l'Afrique
        </span>
      </h2>
      <p className="text-slate-400 text-lg max-w-xl mx-auto mb-12">
        Stokimba connecte les commerçants de Dakar à Douala, d'Abidjan à Lagos.
      </p>

      {/* Carte + Faisceaux */}
      <div ref={containerRef} className="relative max-w-2xl mx-auto">
        {/* La Carte SVG de l'Afrique */}
        <Africa
          className="w-full opacity-20 fill-slate-700 stroke-slate-500 stroke-[0.3]"
        />

        {/* Points de villes avec refs pour AnimatedBeam */}
        {Object.entries(VILLES).map(([key, ville]) => {
          const refMap = { abidjan: hubRef, dakar: dkrRef, douala: dlaRef, lagos: lgsRef, accra: accRef };
          return (
            <div
              key={key}
              ref={refMap[key]}
              className="absolute"
              style={{ top: ville.top, left: ville.left }}
            >
              <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_2px_rgba(34,197,94,0.8)] animate-pulse" />
              <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-300 whitespace-nowrap font-semibold">
                {ville.label}
              </span>
            </div>
          );
        })}

        {/* Faisceaux animés depuis Abidjan (Hub Central) */}
        <AnimatedBeam containerRef={containerRef} fromRef={hubRef} toRef={dkrRef} curvature={-30} duration={3} />
        <AnimatedBeam containerRef={containerRef} fromRef={hubRef} toRef={dlaRef} curvature={10} duration={4} />
        <AnimatedBeam containerRef={containerRef} fromRef={hubRef} toRef={lgsRef} curvature={-10} duration={3.5} />
        <AnimatedBeam containerRef={containerRef} fromRef={hubRef} toRef={accRef} curvature={5} duration={2.5} />
      </div>
    </motion.section>
  );
};
```

### Étape 4 : Intégrer dans LandingPage.jsx

```jsx
// Dans src/pages/LandingPage.jsx — après la section Benefits
import { AfriqueReseauMap } from '@/components/landing/AfriqueReseauMap';

// Dans le JSX, après la section des bénéfices :
<AfriqueReseauMap />
```

## Règles strictes / Bonnes pratiques

- **Sécurité :** Ne jamais `npm install magicui` — il n'existe pas de package officiel. MagicUI = copy-paste uniquement depuis `magicui.design`.
- **Performance :** Envelopper la section dans `whileInView` pour éviter que les faisceaux ne tournent pendant que la section n'est pas visible.
- **Accessibilité :** Ajouter `aria-label="Carte de la couverture géographique Stokimba"` sur le conteneur.
- **Responsive :** Utiliser des pourcentages pour les positions des villes (`top`, `left`) pour garantir la compatibilité mobile.

## Références Sûres
- `@react-map/africa` : `https://www.npmjs.com/package/@react-map/africa`
- `AnimatedBeam` code : `https://magicui.design/docs/components/animated-beam`
- GitHub vérifié : `https://github.com/magicuidesign/magicui`
