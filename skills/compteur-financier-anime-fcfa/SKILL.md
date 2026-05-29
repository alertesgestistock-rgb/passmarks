---
name: compteur-financier-anime-fcfa
description: Implémente des compteurs numériques animés (0 → 250 000 FCFA) et des décrémentations de stock avec retour visuel et sonore ("Bip de scanner") via le package @number-flow/react (github.com/barvian/number-flow, vérifié sain). Inclut la gestion native du format de devise XOF (Franc CFA) via Intl.NumberFormat.
version: 1.0.0
---

# Compteur Financier Animé FCFA — Typographie Dynamique & Retour Haptique

Cette compétence guide l'implémentation de compteurs numériques de niveau production pour afficher des montants en Franc CFA (XOF) avec une animation fluide chiffre par chiffre, ainsi que la simulation d'un scanner de code-barres avec son feedback visuel et sonore.

## Quand utiliser cette compétence ?
- Pour afficher un C.A. du jour qui "grimpe" dans le mockup du téléphone.
- Pour simuler la décrémentation d'un stock (10 → 9) avec un effet "Bip de scanner".
- Pour tous les chiffres clés sur la landing page qui méritent une mise en valeur animée.

## Source & Sécurité (VÉRIFIÉE)

> [!IMPORTANT]
> - ✅ `https://github.com/barvian/number-flow` — Dépôt **vérifié sain** le 20 Avril 2026.
> - Package npm officiel : `@number-flow/react` sur `https://www.npmjs.com/package/@number-flow/react`.
> - **Commande d'installation sûre :** `npm install @number-flow/react`

## Instructions

### Étape 1 : Installation

```bash
npm install @number-flow/react
```

### Étape 2 : Compteur de C.A. (0 → 250 000 FCFA)

Créer `src/components/landing/CompteurCA.jsx` :

```jsx
import React, { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * CompteurCA — Compteur animé du Chiffre d'Affaires en FCFA
 * Package: @number-flow/react (github.com/barvian/number-flow - VÉRIFIÉ)
 */
export const CompteurCA = ({ targetValue = 250000 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      // Déclenchement du compteur dès que l'élément est visible
      const timer = setTimeout(() => setValue(targetValue), 300);
      return () => clearTimeout(timer);
    }
  }, [isInView, targetValue]);

  return (
    <div ref={ref}>
      <div className="font-mono tabular-nums text-2xl font-black text-slate-800 dark:text-slate-200">
        <NumberFlow
          value={value}
          format={{ 
            style: 'currency', 
            currency: 'XOF',          // Franc CFA BCEAO
            maximumFractionDigits: 0,
            // Formatage natif : "250 000 FCFA" via l'API Intl du navigateur
          }}
          locales="fr-FR"
          animated={true}
          // Physique de ressort pour un rendu organique
          transformTiming={{ type: 'spring', duration: 900, bounce: 0.2 }}
        />
      </div>
    </div>
  );
};
```

### Étape 3 : Simulateur de Scanner (10 → 9 + Bip Visuel)

Créer `src/components/landing/SimulateurScanner.jsx` :

```jsx
import React, { useState, useEffect, useRef } from 'react';
import NumberFlow from '@number-flow/react';
import { motion, useAnimation } from 'framer-motion';
import { Scan } from 'lucide-react';

/**
 * SimulateurScanner — Animation du "Bip" de scanner avec décrémentation de stock
 * Combine NumberFlow (chiffres) + Framer Motion (rebond visuel) + Web Audio API (son)
 */
export const SimulateurScanner = () => {
  const [stock, setStock] = useState(10);
  const [isScanning, setIsScanning] = useState(false);
  const [showBip, setShowBip] = useState(false);
  const controls = useAnimation();
  const prevStockRef = useRef(stock);

  // Déclenchement de l'alerte visuelle quand le stock baisse
  useEffect(() => {
    if (prevStockRef.current > stock) {
      triggerBipEffect();
    }
    prevStockRef.current = stock;
  }, [stock]);

  const triggerBipEffect = async () => {
    // 1. Affichage du "Bip!"
    setShowBip(true);

    // 2. Rebond visuel du compteur (scale bounce)
    await controls.start({
      scale: [1, 1.2, 0.9, 1],
      color: ['#1e293b', '#ef4444', '#1e293b'],  // Flash rouge
      transition: { duration: 0.3, times: [0, 0.2, 0.6, 1] },
    });

    // 3. Synthèse sonore du "Bip" de scanner via Web Audio API
    playBeepSound();

    // 4. Masquer le "Bip!" après 800ms
    setTimeout(() => setShowBip(false), 800);
  };

  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);  // Fréquence bip scanner
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (_) {
      // Silencieux si l'API Audio n'est pas disponible (SSR, etc.)
    }
  };

  const handleScan = () => {
    if (stock <= 0 || isScanning) return;
    setIsScanning(true);
    setTimeout(() => {
      setStock((s) => s - 1);
      setIsScanning(false);
    }, 600);
  };

  return (
    <div className="relative p-6 bg-slate-900 rounded-2xl border border-slate-700 text-center space-y-4">
      <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Stock restant</p>

      {/* Compteur animé avec rebond visuel */}
      <motion.div animate={controls} className="text-6xl font-black tabular-nums">
        <NumberFlow
          value={stock}
          animated={true}
          transformTiming={{ type: 'spring', duration: 500, bounce: 0.4 }}
        />
      </motion.div>

      {/* Label "BIP !" flash */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.8 }}
        animate={showBip ? { opacity: 1, y: 0, scale: 1.1 } : { opacity: 0 }}
        className="text-2xl font-black text-red-400 tracking-widest absolute top-4 right-4"
      >
        BIP !
      </motion.div>

      {/* Bouton Scan */}
      <motion.button
        onClick={handleScan}
        disabled={stock <= 0 || isScanning}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 mx-auto px-6 py-3 bg-green-600 hover:bg-green-500 
                   disabled:opacity-40 text-white font-bold rounded-full transition-colors"
      >
        <Scan className="w-5 h-5" />
        {isScanning ? 'Scan en cours...' : 'Scanner un article'}
      </motion.button>

      {stock === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 font-bold text-sm"
        >
          ⚠️ Rupture de stock !
        </motion.p>
      )}
    </div>
  );
};
```

### Étape 4 : Intégrer dans le Mockup Téléphone (LandingPage.jsx)

```jsx
// Remplacer la div "C.A. du jour" statique (ligne ~442-447) par :
import { CompteurCA } from '@/components/landing/CompteurCA';

// Dans le mockup téléphone :
<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl ...">
  <div className="text-xs font-semibold text-slate-500">C.A. du jour</div>
  <CompteurCA targetValue={250000} />
  <div className="flex items-center gap-1 mt-2 text-xs ...">
    <TrendingUp className="w-3 h-3" /> +15% depuis hier
  </div>
</div>
```

## Règles strictes / Bonnes pratiques

- **`tabular-nums`** : Toujours ajouter `font-variant-numeric: tabular-nums` (via class Tailwind `tabular-nums`) pour éviter les oscillations horizontales pendant l'animation.
- **Synthèse sonore :** Utiliser l'API Web Audio native (oscillateur) plutôt qu'un fichier `.mp3` pour éviter un chargement réseau supplémentaire.
- **`try/catch` sur l'audio :** Toujours envelopper l'API Audio dans un `try/catch` — elle n'est pas disponible en environnement SSR ou dans certains navigateurs mobiles restrictifs.
- **Devise XOF :** Utiliser `currency: 'XOF'` avec `locales: 'fr-FR'` pour un affichage natif correct du Franc CFA.

## Références Sûres
- Package npm officiel : `https://www.npmjs.com/package/@number-flow/react`
- GitHub vérifié : `https://github.com/barvian/number-flow`
- Démo live : `https://number-flow.barvian.me/`
