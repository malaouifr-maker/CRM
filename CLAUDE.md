# CLAUDE.md — CRM Dashboard

## Aperçu du projet

Dashboard de suivi des prospects et clients permettant d'uploader un export CSV depuis un CRM et d'afficher des indicateurs clés sur l'activité commerciale.

**Objectifs principaux :**
- Visibilité sur la performance marketing (sources d'acquisition, taux de conversion)
- Valeur du pipeline actuel (pipe brut, pipe pondéré, répartition par étape)
- Prévision du chiffre d'affaires (forecast 30/60/90 jours, scénarios)

---

## Aperçu de l'architecture globale

- **Framework** : Next.js 14 (App Router, rendu client-side)
- **Styling** : Tailwind CSS v3
- **Composants UI** : shadcn/ui (Radix UI + Tailwind) + TanStack Table v8
- **Charts** : Recharts v2
- **Parsing CSV** : Papa Parse v5
- **State** : Zustand v4 (store global des deals entre les routes)
- **Dates** : date-fns v3
- **Icônes** : Lucide React
- **Déploiement** : Vercel

**5 vues principales** : Accueil · Pipeline · Marketing · Forecast · Deals

---

## Style visuel

- Interface claire et minimaliste
- Pas de mode sombre pour le MVP

---

## Contraintes et Politiques

- NE JAMAIS exposer les clés API au client

---

## Dépendances

- Préférer les composants existants plutôt que d'ajouter de nouvelles bibliothèques UI

---

## Tests interface (Playwright)

À la fin de chaque développement qui implique l'interface graphique :
- Tester avec `playwright-skill`
- L'interface doit être **responsive**, **fonctionnelle** et **répondre au besoin développé**

---

## Context7

Utiliser toujours Context7 lors de génération de code, d'étapes de configuration ou d'installation, ou de documentation de bibliothèque/API.
Utiliser automatiquement les outils MCP Context7 pour résoudre l'identifiant de bibliothèque et obtenir la documentation sans que l'utilisateur ait à le demander explicitement.

---

## Langue et spécifications


---

## Documentation

- Spécifications produit : [PRD.md](./PRD.md)
- Architecture technique : [ARCHITECTURE.md](./ARCHITECTURE.md)
