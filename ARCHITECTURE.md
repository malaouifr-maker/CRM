# Architecture Technique — CRM Dashboard

## Stack retenue

### Framework
**Next.js 14** (App Router)
- Routing basé sur le système de fichiers → 5 routes = 5 fichiers dans `app/`
- Rendu client-side pour les données CSV (pas de SSR nécessaire)
- Déploiement natif sur Vercel

### Styling
**Tailwind CSS v3**
- Utility-first, pas de CSS custom à maintenir

### Composants UI
**shadcn/ui**
- Composants copier-coller basés sur Radix UI + Tailwind
- Composants clés utilisés : DataTable (vue Deals), Card, Badge, Select, Dialog, Tabs
- TanStack Table v8 en dessous pour le filtrage/tri/pagination

### Charts
**Recharts v2**
- BarChart : répartition des leads par source marketing
- AreaChart : courbe forecast 30/60/90j
- PieChart / RadialBar : répartition du pipeline par étape
- Composable et React-natif

### Parsing CSV
**Papa Parse v5**
- Standard de facto pour parsing CSV côté browser
- Détection automatique des headers
- Gestion des edge cases (encodages, virgules, guillemets)

### State Management
**Zustand v4**
- Store global : données CSV parsées, persistantes entre les routes
- Store shape :
  ```ts
  {
    deals: Deal[]
    uploadedAt: Date | null
    setDeals: (deals: Deal[]) => void
    clear: () => void
  }
  ```

### Utilitaires de date
**date-fns v3**
- Calcul deals froids (lastActivity > 14 jours)
- Calcul leads non traités (createdAt > 48h)
- Deal velocity (temps moyen entre création et closing)

### Icônes
**Lucide React**

### Déploiement
**Vercel** (intégration Next.js native)

---

## Structure du projet

```
/app
  layout.tsx               → Layout global (sidebar/nav)
  page.tsx                 → Accueil : KPIs synthétiques + alertes + forecast rapide
  /pipeline/page.tsx       → Valeur pipe, répartition par étape, deals froids
  /marketing/page.tsx      → Sources, taux de conversion, qualité leads
  /forecast/page.tsx       → Prévisions 30/60/90j, scénarios
  /deals/page.tsx          → Tableau filtrable de tous les deals

/components
  /upload
    CsvUploader.tsx        → Zone drag & drop + parsing Papa Parse
  /charts
    PipelineChart.tsx      → Répartition pipeline (PieChart/BarChart)
    ForecastChart.tsx      → AreaChart 30/60/90j
    SourcesChart.tsx       → BarChart sources marketing
  /tables
    DealsTable.tsx         → DataTable shadcn/ui + TanStack Table
  /kpi
    KpiCard.tsx            → Carte KPI réutilisable (valeur, label, delta)
  /alerts
    PriorityActions.tsx    → Deals froids, quick wins, leads non traités

/lib
  csv-parser.ts            → Wrapper Papa Parse + validation + mapping champs
  calculations.ts          → Pondération pipeline, forecast, deal velocity
  store.ts                 → Zustand store
  constants.ts             → Probabilités par étape (ex: Negotiation = 75%)

/types
  deal.ts                  → Interface Deal (tous les champs du CSV)
```

---

## Modèle de données

### Interface `Deal` (mappé depuis le CSV)
```ts
interface Deal {
  id: string
  createdDate: Date
  firstName: string
  lastName: string
  email: string
  company: string
  industry: string
  companySize: string
  country: string
  leadSource: 'Website' | 'LinkedIn' | 'Referral' | 'Event' | 'Cold Call' | string
  status: string
  owner: string
  dealValue: number
  pipelineStage: 'Lead' | 'Qualification' | 'Discovery' | 'Proposal Sent' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
  lastContactDate: Date
  nextFollowupDate: Date
  tags: string[]
}
```

### Probabilités par étape (modifiables en V2)
```ts
const STAGE_PROBABILITIES = {
  'Lead': 0.10,
  'Qualification': 0.20,
  'Discovery': 0.40,
  'Proposal Sent': 0.60,
  'Negotiation': 0.80,
  'Closed Won': 1.00,
  'Closed Lost': 0.00,
}
```

---

## Formules métier clés

- **Pipe brut** = Σ dealValue (deals ouverts)
- **Pipe pondéré** = Σ (dealValue × STAGE_PROBABILITIES[stage])
- **Forecast 30j** = Σ dealValue des deals avec nextFollowupDate ≤ today+30, pondéré
- **Deal froid** = lastContactDate < today - 14 jours ET status != Closed
- **Lead non traité** = createdDate < today - 48h ET stage = 'Lead'
- **Quick win** = stage ∈ ['Negotiation', 'Proposal Sent'] ET dealValue élevé

---

## Note sur les données de démo

Le fichier `Extraction.csv` est actuellement encodé en **RTF** (pas un vrai CSV).
Il devra être re-exporté depuis le CRM ou converti avant utilisation.

---

## Dépendances npm

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "tailwindcss": "^3",
    "papaparse": "^5",
    "zustand": "^4",
    "recharts": "^2",
    "@tanstack/react-table": "^8",
    "date-fns": "^3",
    "lucide-react": "latest",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/papaparse": "^5"
  }
}
```

---

## Roadmap technique

| Version | Ajouts techniques |
|---|---|
| **MVP** | Stack de base + CSV upload + 5 vues + calculs pipeline/forecast |
| **V1** | Ajout `localStorage` ou `IndexedDB` (idb) pour persister entre sessions, alertes visuelles |
| **V2** | Export PDF (react-pdf ou jsPDF), comparaison multi-imports, personnalisation probabilités |
