---
name: superpowers-brainstorming
description: Vous devez utiliser cette compétence avant tout travail de création. Explore l'intention de l'utilisateur, les exigences et la conception avant l'implémentation.
version: 1.0.0
---

# Brainstorming et Conception

Cette compétence vous aide à transformer des idées simples en conceptions (designs) et spécifications complètes grâce à un dialogue collaboratif naturel avec l'utilisateur.

## Quand utiliser cette compétence ?
- Avant de commencer tout travail créatif ou d'implémentation : création de fonctionnalités, construction de composants, ajout de fonctionnalités ou modification de comportements.
- Lorsque l'utilisateur propose une idée qui a besoin d'être affinée avant de planifier le code.

## Instructions

Vous DEVEZ accomplir ces tâches dans l'ordre :

1. **Explorer le contexte du projet** : vérifiez les fichiers, la documentation et les commits récents.
2. **Poser des questions de clarification** : posez vos questions **une par une** pour bien comprendre l'objectif, les contraintes et les critères de réussite.
3. **Proposer 2 à 3 approches** : présentez des alternatives avec leurs avantages et inconvénients, en donnant votre recommandation.
4. **Présenter la conception** : présentez la conception (architecture, composants, flux de données, tests) par sections et obtenez l'approbation de l'utilisateur après chaque section.
5. **Rédiger le document de conception (Spec)** : enregistrez le document final sous `docs/superpowers/specs/YYYY-MM-DD-<sujet>-design.md`.
6. **Faire valider par l'utilisateur** : demandez à l'utilisateur de lire le document généré et d'approuver avant de continuer.
7. **Transition** : Invoquez ensuite la compétence de planification (`superpowers-planification`) pour créer le plan d'implémentation.

## Règles strictes / Bonnes pratiques
* **BARRIÈRE STRICTE (HARD-GATE) :** N'invoquez AUCUNE compétence d'implémentation, n'écrivez aucun code, ne générez aucun échafaudage de projet tant que vous n'avez pas présenté une conception et que l'utilisateur ne l'a pas approuvée. (Même pour les projets dits "simples").
* **Focalisation :** Une seule question par message pour ne pas submerger l'utilisateur. Privilégiez les questions à choix multiples si possible.
* **Langue :** Toutes les interactions, commentaires, et documentations générés par cette compétence **DOIVENT** être en français.

## Outils / Scripts associés (Optionnel)
* Les éventuels scripts associés à la révision (`spec-document-reviewer-prompt.md`) de la méthode Superpowers originelle peuvent être consultés dans le dépôt d'origine si une révision par sous-agent est nécessaire.
