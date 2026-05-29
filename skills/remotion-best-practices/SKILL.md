---
name: remotion-best-practices
description: Bonnes pratiques pour Remotion - Création de vidéos en React
version: 1.0.0
---

# Bonnes Pratiques Remotion

Cette compétence regroupe l'ensemble des règles et bonnes pratiques à suivre lors de la rédaction de code avec le framework Remotion (création de vidéos en React). L'objectif est de vous fournir des blocs de codes pré-approuvés et fiables pour toutes les tâches inhérentes à cette technologie.

## Quand utiliser cette compétence ?
- L'utilisateur a une question spécifique sur une fonctionnalité ou une limitation de Remotion.
- Vous devez écrire, corriger ou optimiser du code lié à la génération de vidéos avec Remotion et vous avez besoin de connaissances très pointues sur un sujet particulier.

## Instructions
Pour utiliser les meilleures pratiques sur un sujet précis, lisez le fichier de règles correspondant dans le sous-dossier `rules/` situé dans cette compétence via votre outil de lecture de fichiers. 

Voici la table de correspondance des règles :
- [rules/3d.md](rules/3d.md) - Contenu 3D avec Three.js et React Three Fiber.
- [rules/animations.md](rules/animations.md) - Techniques fondamentales d'animation.
- [rules/assets.md](rules/assets.md) - Importation des images, vidéos, audios et polices.
- [rules/audio.md](rules/audio.md) - Gestion avancée du son (volume, pitch, vitesse, découpage).
- [rules/calculate-metadata.md](rules/calculate-metadata.md) - Réglages de métadonnées dynamiques.
- [rules/can-decode.md](rules/can-decode.md) - Décodage vidéo et compatibilité matérielle via Mediabunny.
- [rules/charts.md](rules/charts.md) - Patterns pour graphiques et visualisation de données.
- [rules/compositions.md](rules/compositions.md) - Définition fine de la composition, dossiers et métadonnées.
- [rules/display-captions.md](rules/display-captions.md) - Affichage dynamique de sous-titres (style TikTok/Surbrillance).
- [rules/extract-frames.md](rules/extract-frames.md) - Extraction précise d'images par timestamp via Mediabunny.
- [rules/fonts.md](rules/fonts.md) - Intégration des polices Google ou des polices locales.
- [rules/get-audio-duration.md](rules/get-audio-duration.md) - Récupération de la durée d'un fichier audio (secondes).
- [rules/get-video-dimensions.md](rules/get-video-dimensions.md) - Mesure des dimensions d'une source vidéo.
- [rules/get-video-duration.md](rules/get-video-duration.md) - Déterminer la durée exacte d'une vidéo (secondes).
- [rules/gifs.md](rules/gifs.md) - Synchroniser des GIFs avec la timeline stricte de Remotion.
- [rules/images.md](rules/images.md) - Méthodes de chargement d'images via le composant Img natif.
- [rules/import-srt-captions.md](rules/import-srt-captions.md) - Conversion et importation de sous-titres `.srt`.
- [rules/lottie.md](rules/lottie.md) - Intégration d'animations Lottie préfabriquées.
- [rules/measuring-dom-nodes.md](rules/measuring-dom-nodes.md) - Calculer la taille d'un nœud DOM pour le positionnement.
- [rules/measuring-text.md](rules/measuring-text.md) - Mesurer un texte et l'ajuster pour empêcher le débordement.
- [rules/sequencing.md](rules/sequencing.md) - Différents patterns de séquençage dans le temps (délais, limitations).
- [rules/tailwind.md](rules/tailwind.md) - Injection propre de TailwindCSS dans Remotion.
- [rules/text-animations.md](rules/text-animations.md) - Les bases de l'animation de typographie et polices.
- [rules/timing.md](rules/timing.md) - Courbes d'interpolation et équations de mouvement (linear, easing, spring).
- [rules/transcribe-captions.md](rules/transcribe-captions.md) - Transcription auto de l'audio (génération de sous-titres).
- [rules/transitions.md](rules/transitions.md) - Patterns certifiés pour les transitions de scènes.
- [rules/trimming.md](rules/trimming.md) - Raccourcir des timelines d'animations (suppression de têtes/queues).
- [rules/videos.md](rules/videos.md) - Vidéo intégrée avancée : volume, pitch, boucles, etc.

## Règles strictes / Bonnes pratiques
* **Focalisation :** Parcourir avec l'outil de vue de fichiers `[view_file]` le fichier concerné avant l'écriture ou la suggestion d'un bloc de code afin de prévenir toute utilisation de syntaxe dépréciée ou invalide.
* **Langue :** Toutes vos actions et suggestions vers l'utilisateur doivent être formatées et expliquées en français, en conservant les noms de librairies en anglais intacts, tel qu'exigé par les modèles génériques de compétences locales.
* Ne modifiez pas ces fichiers markdown sous `rules/` afin de garder une source documentaire saine.

## Outils / Scripts associés (Optionnel)
Se base intégralement sur les règles contenues dans le sous-dossier `rules/`. Aucun script auto-exécutant annexe.
