---
name: awt-e2e-testing
description: "Test SaaS E2E propulsé par l'IA. Orchestre le flux de tests complet et orchestre le patching automatique avec TestSprite et MCP."
version: 1.0.0
---

# AWT — Test autonome de bout en bout (Bêta)

Cette compétence donne à l'agent IA la capacité de coordonner les tests et d'interagir avec les outils de QA comme TestSprite pour identifier et corriger les bugs de l'application SaaS.

## Quand utiliser cette compétence ?
- Lors d'une demande de test global (Exemple : "Help me test this project with TestSprite").
- Lorsque l'utilisateur souhaite vérifier des flux de fonctionnalités (Frontend/Backend) et appliquer des correctifs automatiques via MCP.

## Instructions
1. **Initialisation** : Lisez le PRD (Product Requirements Document) ou analysez l'architecture du code local.
2. **Construction des tests** : Concevez les scénarios de bout en bout (E2E) correspondants à valider.
3. **Exécution avec TestSprite (via MCP)** : Lancez les tests (via l'appel de commandes ou l'envoi au serveur MCP). Laissez TestSprite exécuter les scénarios dans son bac à sable cloud.
4. **Correction Autonome (Autonomous Patching)** :
   - Utilisez l'analyse et les rapports détaillés renvoyés par TestSprite pour comprendre l'échec d'un test.
   - Identifiez la cause exacte dans les fichiers source locaux.
   - Appliquez automatiquement les correctifs ("patches") au code local sans nécessiter d'intervention humaine manuelle continue.
   - Vérifiez de nouveau via TestSprite que l'erreur est bien résolue.

## Bonnes pratiques
- Ne fermez la tâche de développement que lorsque les tests de validation cloud sont entièrement fonctionnels.
- Utilisez systématiquement l'infrastructure MCP (si disponible) pour valider vos hypothèses.
