# Dashboard CRM — Spécifications & Roadmap

## Contexte du projet

Développement d'un Dashboard de suivi des prospects et clients permettant d'uploader un export CSV depuis un CRM et d'afficher des indicateurs clés sur l'activité commerciale.

---

## Objectifs principaux

1. **Visibilité sur la performance marketing** : d'où viennent les leads et lesquels convertissent le mieux
2. **Valeur du pipeline actuel** : comprendre ce qui est en jeu à chaque étape du cycle de vente
3. **Prévision du chiffre d'affaires** : estimer le CA vraisemblable à 30/60/90 jours

---

## KPIs & Fonctionnalités définies

### Performance Marketing
- Sources d'acquisition et taux de conversion par source
- Qualité des leads par source (pas seulement le volume)
- Vitesse d'entrée des nouveaux prospects

### Valeur du Pipeline
- Valeur brute totale des deals ouverts
- Valeur pondérée : montant × probabilité selon l'étape
- Répartition de la valeur par étape du funnel
- Âge moyen des deals (détection des deals "qui pourrissent")

### Prévision CA (Forecast)
- Forecast 30 / 60 / 90 jours basé sur les deals en cours et leur probabilité
- Deal velocity : temps moyen pour closer un deal
- Scénarios : Best case / Most likely / Worst case

### Vue "Actions Prioritaires"
- Deals froids à relancer (sans activité depuis +14 jours)
- Quick wins : deals les plus proches du closing
- Leads entrants non traités depuis +48h

---

## Roadmap

### 🚀 MVP — "Ça marche, ça donne de la valeur immédiatement"
> Objectif : avoir un dashboard fonctionnel avec les données du CSV en moins d'une session de travail

- Upload et parsing automatique du CSV
- KPIs synthétiques : nombre de deals, valeur brute du pipe, taux de conversion global
- Valeur du pipe pondérée par étape (avec probabilités fixes par défaut)
- Forecast simple 30/60/90 jours basé sur les probabilités
- Tableau de deals filtrable (par statut, par source)
- Répartition des leads par source marketing
- Vue "Actions prioritaires" : deals froids, relances à faire, quick wins

---

### V1 — "C'est vraiment utile au quotidien"
> Objectif : en faire un outil de pilotage hebdomadaire

- Analyse du funnel de conversion étape par étape
- Performance marketing par source (taux de conversion + qualité, pas juste volume)
- Scénarios forecast : Best case / Most likely / Worst case
- Alertes visuelles : deals sans activité +14j, closing dépassé
- Comparaison période actuelle vs période précédente

---

### V2 — "C'est un vrai outil de performance"
> Objectif : aller plus loin dans l'analyse et la personnalisation

- Tendances historiques et saisonnalité (évolution du pipe semaine par semaine)
- Deal velocity : temps moyen par étape et par source
- Performance par segment (taille client, secteur d'activité)
- Personnalisation des probabilités par étape (modifiables par l'utilisateur)
- Export de rapports filtrés (PDF ou CSV)
- Sauvegarde de plusieurs imports CSV pour comparer dans le temps

---

### 🚫 Hors-périmètre
> Trop complexe ou trop coûteux pour la valeur apportée à ce stade

- Connexion directe au CRM via API (Hubspot, Salesforce...)
- Système multi-utilisateurs avec login et droits d'accès
- Vue Kanban interactive (drag & drop des deals)
- Notifications par email ou Slack
- Prévisions IA / scoring prédictif des deals
- Intégration budget marketing pour calcul du coût par lead

---

## Tableau récapitulatif

| Fonctionnalité | MVP | V1 | V2 | Hors-périmètre |
|---|:---:|:---:|:---:|:---:|
| Upload CSV | ✅ | | | |
| KPIs synthétiques | ✅ | | | |
| Valeur pipe pondérée | ✅ | | | |
| Forecast 30/60/90j | ✅ | | | |
| Tableau filtrable | ✅ | | | |
| Répartition par source | ✅ | | | |
| Actions prioritaires | ✅ | | | |
| Analyse funnel | | ✅ | | |
| Alertes deals froids | | ✅ | | |
| Scénarios forecast | | ✅ | | |
| Tendances historiques | | | ✅ | |
| Deal velocity | | | ✅ | |
| Export rapports | | | ✅ | |
| Connexion CRM API | | | | 🚫 |
| Multi-utilisateurs | | | | 🚫 |
| Scoring IA | | | | 🚫 |

---

## Structure suggérée du dashboard

| Vue | Contenu |
|---|---|
| **Accueil** | KPIs synthétiques + alertes + forecast rapide |
| **Pipeline** | Valeur du pipe, répartition par étape, deals froids |
| **Marketing** | Sources, conversion, qualité des leads |
| **Forecast** | Prévisions 30/60/90j, scénarios |
| **Deals** | Tableau filtrable de tous les deals |

---

## Format des données d'entrée

- **Format** : CSV export CRM
- **Champs clés attendus** : statut/étape, montant du deal, source marketing, date de dernière activité, date de closing estimée
- **Import** : manuel via upload dans l'interface
