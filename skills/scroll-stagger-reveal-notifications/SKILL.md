---
name: scroll-stagger-reveal-notifications
description: Orchestre l'apparition en cascade (Stagger) d'éléments (notifications, cartes, textes) au défilement via Framer Motion variants + whileInView. Intègre le pattern AnimatedList de MagicUI (github.com/magicuidesign/magicui) pour des alertes de stock ou de transaction qui se révèlent séquentiellement lors du scroll, avec un effet "Sticky" optionnel.
version: 1.0.0
---

# Scroll Stagger Reveal & Notifications — Révélation Séquentielle au Défilement

Cette compétence guide la création d'animations de défilement sophistiquées où des notifications ou cartes apparaissent en cascade (stagger) uniquement lorsque l'utilisateur atteint cette zone de la page.

## Quand utiliser cette compétence ?
- Quand l'utilisateur veut des éléments qui "apparaissent au bon moment" pendant le scroll.
- Pour créer une liste animée de notifications de stock, de ventes, ou d'alertes.
- Pour remplacer des sections statiques par des présentations cinématiques au défilement.

## Source & Sécurité (VÉRIFIÉE)

> [!IMPORTANT]
> - ✅ `https://github.com/magicuidesign/magicui` — Dépôt **vérifié sain** le 20 Avril 2026.
> - Le composant `AnimatedList` s'utilise en **copy-paste** depuis `https://magicui.design/docs/components/animated-list`.
> - Framer Motion est **déjà installé** dans le projet Stokimba.

## Instructions

### Étape 1 : Le Pattern "Variants" Parent-Enfant (Fondation)

C'est l'architecture core de l'animation stagger. **Ne pas utiliser `setTimeout` ou `delay` manuel.**

```jsx
// Architecture Variants — À réutiliser dans tous les composants stagger
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,  // Délai entre chaque enfant
      delayChildren: 0.2,     // Délai avant le premier enfant
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', bounce: 0.3, duration: 0.8 },
  },
};
```

### Étape 2 : Créer les Notifications Animées de Stock

Créer `src/components/landing/AnimatedStockNotifications.jsx` :

```jsx
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, CheckCircle, ShoppingBag } from 'lucide-react';

const NOTIFICATIONS = [
  {
    id: 1,
    type: 'warning',
    icon: AlertTriangle,
    title: '⚠️ Stock critique',
    message: 'T-Shirt Basic (Taille M) — 2 unités restantes',
    time: 'À l\'instant',
    color: 'border-orange-500/30 bg-orange-950/20',
    iconColor: 'text-orange-400',
  },
  {
    id: 2,
    type: 'sale',
    icon: ShoppingBag,
    title: '✅ Vente enregistrée',
    message: 'Sneakers Air Max × 1 — 45 000 FCFA',
    time: 'Il y a 2 min',
    color: 'border-green-500/30 bg-green-950/20',
    iconColor: 'text-green-400',
  },
  {
    id: 3,
    type: 'trend',
    icon: TrendingDown,
    title: '📉 Rupture imminente',
    message: 'Casquette NY — 0 unité après prochaine vente',
    time: 'Prévision',
    color: 'border-red-500/30 bg-red-950/20',
    iconColor: 'text-red-400',
  },
  {
    id: 4,
    type: 'success',
    icon: CheckCircle,
    title: '🎯 Réapprovisionnement',
    message: 'Commande fournisseur envoyée avec succès',
    time: 'Il y a 15 min',
    color: 'border-blue-500/30 bg-blue-950/20',
    iconColor: 'text-blue-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', bounce: 0.3, duration: 0.8 },
  },
};

export const AnimatedStockNotifications = () => (
  <section className="py-24 px-4 bg-black">
    <div className="container mx-auto max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Texte gauche — Effet Sticky optionnel */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="lg:sticky lg:top-24"
        >
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
            Votre stock vous{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
              parle en temps réel
            </span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Stokimba vous alerte instantanément avant les ruptures. 
            Fini les clients repartis les mains vides.
          </p>
        </motion.div>

        {/* Notifications Stagger — Déclenchées au scroll */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col gap-4"
        >
          {NOTIFICATIONS.map((notif) => {
            const Icon = notif.icon;
            return (
              <motion.div
                key={notif.id}
                variants={itemVariants}
                className={`
                  flex items-start gap-4 p-4 rounded-2xl border
                  backdrop-blur-sm ${notif.color}
                `}
              >
                <div className={`mt-0.5 ${notif.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{notif.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5 truncate">{notif.message}</p>
                </div>
                <span className="text-slate-500 text-xs shrink-0">{notif.time}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  </section>
);
```

### Étape 3 : Intégrer dans LandingPage.jsx

```jsx
import { AnimatedStockNotifications } from '@/components/landing/AnimatedStockNotifications';

// Placer après la section des Key Features
<AnimatedStockNotifications />
```

## Règles strictes / Bonnes pratiques

- **`viewport={{ once: true }}`** : Toujours utiliser `once: true` pour que l'animation ne se rejoue pas en remontant la page (comportement Premium).
- **`margin: "-100px"`** : Déclencher l'animation quand l'élément est déjà à 100px dans le viewport (plus naturel).
- **Jamais `setTimeout` :** Utiliser exclusivement `staggerChildren` pour les délais entre les enfants.
- **Performance :** S'assurer que les variantes n'animent que `opacity`, `y` et `scale` (propriétés GPU).

## Références Sûres
- AnimatedList MagicUI : `https://magicui.design/docs/components/animated-list`
- Stagger Framer Motion : `https://motion.dev/docs/react-animation#orchestration`
