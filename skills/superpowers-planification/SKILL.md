---
name: superpowers-planification
description: Utilisé lorsque vous avez une spécification ou des exigences pour une tâche à plusieurs étapes, avant de toucher au code (planification d'implémentation).
version: 1.0.0
---

# Planification et Plans d'Implémentation

Cette compétence sert à rédiger des plans d'implémentation complets. En les créant, agissez comme si l'ingénieur exécutant le plan n'avait aucun contexte sur la base de code existante. Documentez tout ce dont il a besoin : quels fichiers toucher pour chaque tâche, comment vérifier le code, quoi tester. Fractionnez l'ensemble en tâches de petite taille et respectez les principes DRY, YAGNI, Test-Driven Development (TDD) et commits fréquents.

## Quand utiliser cette compétence ?
- L'utilisateur vous demande de planifier le code pour une fonctionnalité.
- Après la validation du document de conception (`superpowers-brainstorming`).
- Avant de commencer la modification du code source pour une fonctionnalité ou une tâche multi-étapes décrite de façon claire.

## Instructions

1. **Vérification de la portée (Scope Check)** : Si la spécification couvre plusieurs sous-systèmes, divisez la planification en plans partiels pertinents (un par sous-système productif).
2. **Définition de la structure de fichiers** : Cartographiez quels fichiers seront créés/modifiés. Chaque fichier doit avoir une responsabilité unique et claire. Séparez par rôle, non par couche technique.
3. **Rédaction du plan** : Rédigez le fichier en y indiquant un En-tête de Plan `(Feature Name) Plan d'implémentation`, mentionnant le but, l'architecture, et le Tech Stack.
4. **Conception Micro-Étapes (Tâches)** : Chaque étape représente 2-5 minutes de travail d'ingénierie :
   * Rédiger le test qui échoue (`- [ ] step 1`).
   * Lancer le test pour voir où et pourquoi il échoue.
   * Écrire l'implémentation minimale passante.
   * Relancer le test pour confirmation de succès.
   * "Commit" le travail.
5. **Chemin d'enregistrement** : Sauvegardez le plan final sous `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`.
6. **Remise pour Exécution (Handoff)** : Une fois le plan terminé et relu, demandez à l'utilisateur : *"Plan terminé et sauvegardé sous `docs/superpowers/[...]`. Souhaitez-vous commencer l'exécution ?"*

## Règles strictes / Bonnes pratiques
* **Précision maximale** : Définissez toujours les chemins exacts pour les fichiers modifiés et les commandes exactes avec l'output espéré.
* **Langue** : La compétence et les plans rédigés, y compris les questions à l'utilisateur, **DOIVENT** être en français, respectant le cahier des charges du projet initial.
* **TDD obligatoire** : Respecter vigoureusement l'ordre "Testing > Code Minimal > Validation > Commit".

## Outils / Scripts associés (Optionnel)
Se référer au prompt original `plan-document-reviewer-prompt.md` du dépôt si une révision automatique par un sous-agent de ce plan de développement s'avère nécessaire afin d'augmenter sa robustesse.
