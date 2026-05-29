---
name: createur-de-competences
description: Génère, structure et valide de nouvelles compétences Antigravity. À utiliser à chaque fois que l'utilisateur demande de créer une nouvelle compétence.
version: 1.0.0
---

# Créateur de compétences

Cette compétence globale a pour but de vous guider dans la création de nouvelles compétences (skills) pour Antigravity. Elle garantit que toutes les compétences générées respectent le format officiel, les bonnes pratiques, et sont rédigées **intégralement en français**.

## Quand utiliser cette compétence ?
- Lorsque l'utilisateur demande explicitement la création, la conception ou l'ajout d'une nouvelle compétence (skill).
- Lorsque vous identifiez un flux de travail répétitif qui bénéficierait d'être automatisé via une compétence.

## Emplacement des compétences
Selon le besoin, vous devez créer la compétence soit :
- **Globalement** (pour tous les projets) : `C:\Users\user\.gemini\antigravity\skills\[nom-de-la-competence]`
- **Spécifiquement à un projet** : `[dossier-du-projet]\.gemini\antigravity\skills\[nom-de-la-competence]`

## Instructions de création

Pour créer une nouvelle compétence, suivez scrupuleusement ces étapes :

1. **Analyse du besoin :**
   - Comprenez parfaitement l'objectif de la future compétence.
   - Identifiez si elle nécessite des scripts externes ou si de simples instructions suffisent.

2. **Création de la structure de base :**
   - Créez au minimum le répertoire de la compétence et le fichier `SKILL.md` à l'intérieur.
   - Si besoin, créez les sous-dossiers `scripts/` et `templates/`.

3. **Rédaction du fichier `SKILL.md` :**
   - **IMPORTANT :** Vous **DEVEZ** utiliser le modèle fourni dans `templates/template-skill.md` comme base de départ, soit en le copiant, soit en vous en inspirant fortement.
   - Le fichier doit commencer par le frontmatter YAML contenant au minimum `name` et `description`.
   - La `description` dans le frontmatter est **cruciale** : elle doit être précise et concise (une ou deux phrases maximum) car c'est elle que le système lira pour décider d'invoquer la compétence.
   - Rédigez tout le contenu (titres, instructions, règles) **exclusivement en français**.

4. **Bonnes pratiques à intégrer dans le nouveau `SKILL.md` :**
   - **Focalisation extrême :** La compétence doit faire une seule chose très bien.
   - **Arbres de décision :** Si la tâche est complexe, intégrez une section pour aider l'agent à choisir la bonne approche.
   - **Scripts "Boîte Noire" :** Si vous ajoutez des scripts (Python, Bash, Node...), incluez toujours une fonction `--help`. Indiquez dans `SKILL.md` qu'il est préférable d'exécuter `script --help` plutôt que d'utiliser l'outil de lecture de fichier sur le code entier pour économiser du contexte.

5. **Validation :**
   - Relisez le fichier généré pour vérifier la syntaxe Markdown, l'indentation YAML, et l'orthographe en français.
   - Demandez à l'utilisateur de valider la nouvelle compétence une fois celle-ci en place.

## Structure standard attendue

```text
[nom-de-la-competence]/
├── SKILL.md          # <- Le point d'entrée (obligatoire)
├── scripts/          # <- Dossier pour les exécutables (optionnel)
│   └── helper.py     # <- Exemple de script
└── templates/        # <- Dossier pour les modèles génériques (optionnel)
```
