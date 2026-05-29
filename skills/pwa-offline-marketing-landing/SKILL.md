---
name: pwa-offline-marketing-landing
description: Crée une section marketing "Anti-Coupure" pour la landing page qui met en avant les capacités hors-ligne (PWA) d'une application React. Exploite les composants InstallPWA.jsx et les capacités d'enregistrement du Service Worker pour créer un argumentaire de vente ciblé pour les marchés africains avec connectivité instable.
version: 1.0.0
---

# PWA Offline Marketing Landing — "L'Application Sans Réseau"

Cette compétence guide la création d'une section Marketing dédiée à la mise en valeur du mode hors-ligne (PWA) comme argument de vente majeur, spécifiquement ciblé pour les marchés africains.

## Quand utiliser cette compétence ?
- Pour créer la section "Anti-Coupure" ou "Fonctionne sans internet" sur la landing page.
- Pour transformer une feature technique (Service Worker) en bénéfice client compréhensible.
- Pour les marchés avec infrastructure réseau instable (Afrique de l'Ouest/Centrale).

## Concept Marketing

> L'argument FCFA/réseau est le plus fort sur ce marché. Les commerçants africains ont une peur réelle d'une app qui "ne marche pas sans internet". Cette section doit **DÉTRUIRE cette peur** dès la lecture.

## Instructions

### Étape 1 : Créer la Section "Anti-Coupure"

Créer `src/components/landing/SectionOfflineMode.jsx` :

```jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, CheckCircle, Zap, Cloud, Smartphone } from 'lucide-react';

const AVANTAGES = [
  {
    icon: WifiOff,
    titre: 'Sans réseau ? Continuez à vendre',
    desc: 'Encaissez, gérez votre stock et créez des factures même sans 4G ni WiFi.',
    couleur: 'text-orange-400 bg-orange-950/30',
    bordure: 'border-orange-500/30',
  },
  {
    icon: Cloud,
    titre: 'Synchronisation automatique',
    desc: 'Dès que votre connexion revient, Stokimba synchronise tout. Zéro perte de données.',
    couleur: 'text-blue-400 bg-blue-950/30',
    bordure: 'border-blue-500/30',
  },
  {
    icon: Smartphone,
    titre: 'Installable sur votre téléphone',
    desc: 'Installez l\'app comme une vraie application. Aucun App Store requis.',
    couleur: 'text-green-400 bg-green-950/30',
    bordure: 'border-green-500/30',
  },
];

// Simulation visuelle : Toggle Connexion ON/OFF
const ToggleConnexion = () => {
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm">Simulation réseau</span>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            isOnline 
              ? 'bg-green-600 text-white' 
              : 'bg-red-900/50 border border-red-500/50 text-red-400'
          }`}
        >
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? 'Connecté' : 'Hors-ligne'}
        </button>
      </div>

      {/* App Mini simulée */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isOnline ? 'online' : 'offline'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-800 rounded-xl p-4 space-y-3"
        >
          {/* Bannière état réseau */}
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 bg-orange-950/50 border border-orange-500/30 rounded-lg px-3 py-2"
            >
              <WifiOff className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-orange-300 text-xs font-semibold">
                Mode hors-ligne — Vos données sont sauvegardées localement
              </span>
            </motion.div>
          )}

          {/* Simulation d'une vente */}
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <div>
              <p className="text-white font-semibold text-sm">Enregistrer une vente</p>
              <p className="text-slate-400 text-xs mt-0.5">Sneakers Air Max × 1</p>
            </div>
            <button className={`px-4 py-2 rounded-lg text-sm font-bold ${
              isOnline ? 'bg-green-600 text-white' : 'bg-green-600 text-white'
            }`}>
              {isOnline ? '✅ Vendre' : '💾 Vendre (local)'}
            </button>
          </div>

          <p className="text-slate-500 text-xs text-center">
            {isOnline 
              ? '→ Synchronisé en temps réel avec le cloud' 
              : '→ Sera synchronisé à la reconnexion'
            }
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const SectionOfflineMode = () => (
  <section className="py-24 px-4 bg-black border-y border-slate-800">
    <div className="container mx-auto max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Texte */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-950/50 border border-orange-500/30 text-orange-400 text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            Conçu pour l'Afrique
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
            Plus de réseau ?{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
              Pas de problème.
            </span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Stokimba fonctionne à 100% sans connexion internet. 
            Continuez à encaisser vos clients même pendant les coupures de réseau.
            Tous vos données se synchronisent automatiquement au retour de la connexion.
          </p>

          {/* Liste avantages */}
          <div className="space-y-4">
            {AVANTAGES.map((av) => {
              const Icon = av.icon;
              return (
                <motion.div
                  key={av.titre}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className={`flex gap-4 p-4 rounded-xl border ${av.bordure} ${av.couleur.split(' ')[1]}`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${av.couleur.split(' ')[0]}`} />
                  <div>
                    <p className="font-semibold text-white text-sm">{av.titre}</p>
                    <p className="text-slate-400 text-xs mt-1">{av.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Demo interactive */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <ToggleConnexion />
        </motion.div>
      </div>
    </div>
  </section>
);
```

### Étape 2 : Intégrer dans LandingPage.jsx

```jsx
import { SectionOfflineMode } from '@/components/landing/SectionOfflineMode';

// Placer entre la Hero Section et la section Benefits :
<SectionOfflineMode />
```

## Règles strictes / Bonnes pratiques

- **Pas de nouvelles dépendances** : Ce composant est 100% autonome avec Framer Motion + Lucide (déjà présents).
- **Message adapté au terrain** : Ne jamais dire "PWA" ou "Service Worker" au client. Dire "Sans réseau" et "Anti-Coupure".
- **Le toggle interactif** est optionnel mais très puissant : il prouve visuellement le concept sans que le client ait besoin d'y croire sur parole.

## Références Sûres
- PWA Web MDN : `https://developer.mozilla.org/fr/docs/Web/Progressive_web_apps`
- InstallerPWA.jsx (déjà dans le projet) : `src/components/InstallPWA.jsx`
