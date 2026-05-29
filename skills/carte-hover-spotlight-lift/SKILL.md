---
name: carte-hover-spotlight-lift
description: Implémente l'effet "Card Spotlight" (bordure lumineuse qui suit la souris) et "Lift" (élévation physique au survol) sur des cartes React via Framer Motion useMotionValue et useMotionTemplate. Pattern copié manuellement depuis ui.aceternity.com/components/card-spotlight. Idéal pour les sections de fonctionnalités ou de cas d'usage.
version: 1.0.0
---

# Carte Hover Spotlight & Lift — Interaction Tactile Premium

Cette compétence guide la création de cartes interactives ultra-premium avec un éclairage dynamique qui suit le curseur de la souris. Ce pattern est la signature visuelle des interfaces de Linear, Vercel et Stripe.

## Quand utiliser cette compétence ?
- Pour les sections "Fonctionnalités" ou "Cas d'usage par métiers" de la landing page.
- Quand l'utilisateur veut des cartes qui "réagissent" au survol de façon sophistiquée.
- Pour remplacer de simples cartes statiques avec bordures par des cartes "vivantes".

## Source & Sécurité

> [!IMPORTANT]
> Aceternity UI est **uniquement copy-paste** depuis `https://ui.aceternity.com/components/card-spotlight`.
> **Aucun package npm à installer.** Le composant est 100% autonome avec Framer Motion (déjà présent).

## Instructions

### Étape 1 : Créer le composant CardSpotlight

Créer `src/components/ui/CardSpotlight.jsx` :

```jsx
import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';

/**
 * CardSpotlight — Carte avec éclairage dynamique qui suit la souris
 * Pattern inspiré d'Aceternity UI (ui.aceternity.com/components/card-spotlight)
 * SOURCE VÉRIFIÉE : pattern 100% autonome, aucune dépendance externe.
 */
export const CardSpotlight = ({ children, className = "", spotlightColor = "rgba(34,197,94,0.12)" }) => {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Génère le gradient radial CSS dynamiquement sans re-rendu React
  const spotlightBackground = useMotionTemplate`
    radial-gradient(300px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)
  `;

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      // Élévation physique au survol (Spring physics pour un rendu organique)
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`
        relative rounded-2xl border border-white/10 bg-neutral-950/60
        backdrop-blur-xl overflow-hidden cursor-pointer
        ${className}
      `}
    >
      {/* Couche d'éclairage dynamique (suit la souris) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: spotlightBackground }}
      />
      {/* Bordure lumineuse réactive au survol */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: spotlightBackground,
          opacity: 0.6,
        }}
      />
      {/* Contenu de la carte */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  );
};
```

### Étape 2 : Créer la section "Ciblage par Métiers"

Créer `src/components/landing/SectionMetiers.jsx` :

```jsx
import React from 'react';
import { motion } from 'framer-motion';
import { CardSpotlight } from '@/components/ui/CardSpotlight';

const METIERS = [
  {
    emoji: '💊',
    titre: 'Pharmacies',
    description: 'Gérez des centaines de petites références avec des alertes de péremption automatiques.',
    couleur: 'rgba(34,197,94,0.15)',
  },
  {
    emoji: '👕',
    titre: 'Prêt-à-porter',
    description: 'Suivez les variantes de tailles et couleurs. Vendez en boutique ET en ligne.',
    couleur: 'rgba(168,85,247,0.15)',
  },
  {
    emoji: '🔨',
    titre: 'Quincailleries',
    description: 'Scan ultra-rapide aux caisses. Gestion des achats en gros et ventes au détail.',
    couleur: 'rgba(249,115,22,0.15)',
  },
  {
    emoji: '🏪',
    titre: 'Boutiques & Marchés',
    description: 'Fonctionne même sans internet. Idéal pour les marchés avec réseau instable.',
    couleur: 'rgba(59,130,246,0.15)',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.3 } },
};

export const SectionMetiers = ({ onCTA }) => (
  <section className="py-24 px-4 bg-black">
    <div className="container mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl md:text-5xl font-extrabold text-white mb-4"
      >
        Pensé pour{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
          VOTRE boutique
        </span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="text-slate-400 text-lg max-w-2xl mx-auto mb-16"
      >
        Quelle que soit votre activité, Stokimba s'adapte à vos besoins réels sur le terrain.
      </motion.p>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {METIERS.map((metier) => (
          <motion.div key={metier.titre} variants={itemVariants}>
            <CardSpotlight spotlightColor={metier.couleur} className="h-full text-left">
              <div className="text-4xl mb-4">{metier.emoji}</div>
              <h3 className="text-xl font-bold text-white mb-2">{metier.titre}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{metier.description}</p>
            </CardSpotlight>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);
```

### Étape 3 : Intégrer dans LandingPage.jsx

```jsx
import { SectionMetiers } from '@/components/landing/SectionMetiers';

// Placer entre la section Features et la section Testimonials
<SectionMetiers onCTA={() => handleStartTrial(true)} />
```

## Règles strictes / Bonnes pratiques

- **Performance :** `useMotionValue` + `useMotionTemplate` contourne le cycle de re-rendu React. Ne jamais utiliser `useState` pour les coordonnées de la souris.
- **Accessibilité :** Tester que le contenu des cartes reste lisible même sans interactions (pas d'informations cachées par le spotlight).
- **Thème :** Adapter `spotlightColor` à la couleur d'accent de chaque carte pour une individualité visuelle.

## Références Sûres
- Pattern Card Spotlight : `https://ui.aceternity.com/components/card-spotlight`
- useMotionValue docs : `https://motion.dev/docs/react-use-motion-value`
