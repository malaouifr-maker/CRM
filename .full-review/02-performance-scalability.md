# Phase 2: Performance & Scalability Analysis

**Target:** `ARCHITECTURE.md` — CRM Dashboard
**Framework:** Next.js 14 (App Router), PapaParse v5, Recharts v2, TanStack Table v8, Zustand v4, Vercel
**Date:** 2026-02-21
**Analyst:** Performance Engineering Review

---

## Severity Reference

| Level | Definition |
|---|---|
| Critical | Causes immediate, user-visible degradation or hard failure at realistic dataset sizes |
| High | Causes measurable slowdown or memory pressure with moderate datasets (>1 000 rows) |
| Medium | Causes inefficiency that compounds at scale or degrades DX significantly |
| Low | Minor inefficiency; acceptable at MVP scale but should be tracked |

---

## Section 1 — CSV Parsing Performance

### PERF-C1 — PapaParse runs synchronously on the main thread

**Severity:** Critical
**Estimated impact:** UI freeze of 2–8 seconds for a 10 000-row CSV on a mid-range laptop. Complete tab unresponsiveness during parse. Browser may display "Page Unresponsive" dialog at 50 000+ rows.

**Root cause:**
The architecture specifies PapaParse v5 in `CsvUploader.tsx` with no mention of the `worker: true` option. The default PapaParse execution model blocks the JavaScript event loop for the entire duration of parsing, tokenizing, and type coercion. During this time, the browser cannot respond to user input, cannot paint, and cannot process any React state updates.

**Realistic thresholds:**

| Row Count | Approx. File Size | Estimated Freeze Duration (mid-range CPU) |
|---|---|---|
| 1 000 | ~150 KB | 50–150 ms (noticeable jank) |
| 10 000 | ~1.5 MB | 2–5 seconds (user-visible freeze) |
| 50 000 | ~7.5 MB | 10–25 seconds (tab may become unresponsive) |
| 100 000 | ~15 MB | >30 seconds (likely browser kill signal) |

**Recommendation:**
Enable PapaParse's built-in Web Worker mode. This is a single configuration change and requires no external Worker setup because PapaParse bundles its own worker.

```typescript
// /lib/csv-parser.ts
import Papa from 'papaparse'

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      worker: true,          // Offloads parsing to a separate thread
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { deals, warnings, errors } = mapAndValidate(results.data)
        resolve({ deals, warnings, errors, totalRows: results.data.length })
      },
      error: (error) => reject(error),
    })
  })
}
```

**Caveat:** With `worker: true`, the result callback arrives asynchronously. The store mutation (`setDeals`) must happen inside `complete`, which requires the Zustand store to be accessible outside React components. Zustand supports this via its vanilla store API — document this pattern explicitly.

---

### PERF-C2 — No file size or row count gate before parsing begins

**Severity:** Critical
**Estimated impact:** A 500 MB CSV (not unrealistic for enterprise CRM exports) will attempt to load entirely into the V8 heap, triggering an OOM crash in the browser tab with no user feedback.

**Root cause:**
The architecture defines no `maxFileSize` or `maxRowCount` constant. `CsvUploader.tsx` will accept any file from the OS file picker or drag-and-drop. PapaParse's `step` callback (streaming) is not mentioned.

**Recommendation:**
Implement a two-tier gate: (1) file size check before parsing starts, (2) row count check via PapaParse's `step` callback to abort early on oversized datasets.

```typescript
// /lib/constants.ts
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  // 10 MB hard limit
export const MAX_ROW_COUNT = 50_000                   // Performance soft limit
export const WARN_ROW_COUNT = 10_000                  // Show performance warning

// /lib/csv-parser.ts
export function parseCSV(file: File): Promise<ParseResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Promise.reject(
      new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 10 MB.`)
    )
  }

  let rowCount = 0
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      worker: true,
      header: true,
      skipEmptyLines: true,
      step: (row, parser) => {
        rowCount++
        if (rowCount > MAX_ROW_COUNT) {
          parser.abort()
          reject(new Error(`Dataset exceeds ${MAX_ROW_COUNT.toLocaleString()} rows. This dashboard is optimized for up to ${MAX_ROW_COUNT.toLocaleString()} deals.`))
        }
      },
      complete: (results) => { /* ... */ },
    })
  })
}
```

---

### PERF-H1 — No streaming/chunked parse for progressive rendering

**Severity:** High
**Estimated impact:** Even with Web Worker enabled, the user sees a blank/loading state for the entire parse duration before any data appears. For a 5 000-row file this is 500 ms–2 s of perceived inactivity.

**Root cause:**
The architecture implies a "parse completely → setDeals → render" flow. PapaParse supports a `chunk` callback for incremental processing, which enables progressive loading.

**Recommendation:**
For V1, implement chunked parsing to load the first 500 rows immediately for fast initial paint, then continue ingesting the rest in the background.

```typescript
// /lib/csv-parser.ts — progressive approach
let accumulated: RawCsvRow[] = []
const FIRST_PAINT_THRESHOLD = 500

Papa.parse<RawCsvRow>(file, {
  worker: true,
  header: true,
  chunk: (results) => {
    accumulated = [...accumulated, ...results.data]
    // First paint: show data as soon as enough rows are ready
    if (accumulated.length >= FIRST_PAINT_THRESHOLD) {
      const { deals } = mapAndValidate(accumulated)
      store.getState().setDeals(deals)
    }
  },
  complete: () => {
    // Final commit with all rows
    const { deals, warnings, errors } = mapAndValidate(accumulated)
    store.getState().setDeals(deals)
  },
})
```

---

## Section 2 — Memory Management

### PERF-C3 — Entire Deal[] array held in Zustand in-memory store with no eviction

**Severity:** Critical
**Estimated impact:** A 50 000-row dataset with the full `Deal` interface (~30 fields per row) occupies approximately 60–120 MB of V8 heap memory. This persists for the entire browser session. On mobile devices or low-memory desktops, this will cause tab crashes.

**Root cause:**
The Zustand store shape is `{ deals: Deal[] }`. No upper bound, no pagination at the data layer, no lazy loading. All 50 000 `Deal` objects are fully hydrated with all 18 fields and live in the JavaScript heap for the entire session.

**Memory estimation:**

| Row Count | Estimated Heap Usage | Risk |
|---|---|---|
| 1 000 | ~2–5 MB | Safe |
| 10 000 | ~20–50 MB | Acceptable on desktop |
| 50 000 | ~100–250 MB | Tab crash risk on mobile |
| 100 000 | ~200–500 MB | Near-certain OOM on any device |

**Recommendation:**
At MVP scale (up to 10 000 rows), current approach is acceptable with the row count gate from PERF-C2. For V2, consider storing only a minimal `DealSummary` type in Zustand (fields needed for calculations) and lazy-loading full `Deal` records for the table view on demand.

```typescript
// /types/deal.ts — V2 memory-optimized approach
interface DealSummary {
  id: string
  dealValue: number
  pipelineStage: PipelineStage
  lastContactDate: string  // ISO string, not Date object
  nextFollowupDate: string
  createdDate: string
  leadSource: string
  owner: string
  status: string
}

// Full Deal only materialized when a specific row is expanded/viewed
interface Deal extends DealSummary {
  firstName: string
  lastName: string
  email: string
  company: string
  industry: string
  companySize: string
  country: string
  tags: string[]
}
```

---

### PERF-H2 — Date objects parsed per Deal increase memory footprint

**Severity:** High
**Estimated impact:** JavaScript `Date` objects are heavyweight compared to ISO strings. Three `Date` fields per deal × 50 000 rows = 150 000 `Date` object allocations in addition to the raw value. This increases heap pressure and GC pause frequency.

**Root cause:**
The `Deal` interface specifies `createdDate: Date`, `lastContactDate: Date`, `nextFollowupDate: Date`. If PapaParse output is mapped to `Date` objects eagerly at parse time, the GC must track all of them.

**Recommendation:**
Store dates as ISO strings in Zustand (also fixes the JSON serialization issue from CQ-C2/AR-M7). Convert to `Date` objects lazily at the point of calculation only.

```typescript
// /lib/calculations.ts — lazy date conversion at calculation site
import { parseISO, differenceInDays, isValid } from 'date-fns'

function isColdDeal(deal: DealSummary, today: Date): boolean {
  const lastContact = parseISO(deal.lastContactDate) // Parsed once, per call, GC-eligible immediately
  return isValid(lastContact) && differenceInDays(today, lastContact) > 14 && deal.status !== 'Closed'
}
```

---

### PERF-M1 — No derived data caching — aggregations recomputed from raw array every render

**Severity:** Medium
**Estimated impact:** With 10 000 deals and five pages each computing their own aggregations, every navigation between pages triggers 5–10 full O(n) array scans. On initial navigation: 50–200 ms computation time before first meaningful paint.

**Root cause:**
No memoization layer is described in the architecture. The architecture mentions `calculations.ts` but there is no mention of `useMemo`, `useCallback`, or a computed/derived store layer. This means every React re-render triggered by any state change will re-execute all business calculations.

**Recommendation:**
Define canonical memoized hooks. All pages use these hooks, never calling calculation functions directly.

```typescript
// /lib/hooks/usePipelineMetrics.ts
import { useMemo } from 'react'
import { useDealsStore } from '@/lib/store'
import { selectOpenDeals } from '@/lib/selectors'
import { computePipelineMetrics } from '@/lib/calculations/pipeline'

export function usePipelineMetrics() {
  const deals = useDealsStore(selectOpenDeals) // Selector ensures stable reference
  return useMemo(() => computePipelineMetrics(deals), [deals])
}

// /lib/hooks/useForecastMetrics.ts
export function useForecastMetrics() {
  const deals = useDealsStore(selectOpenDeals)
  const today = useMemo(() => new Date(), []) // Stable date reference within a session
  return useMemo(() => computeForecastMetrics(deals, today), [deals, today])
}
```

---

## Section 3 — Render Performance

### PERF-C4 — TanStack Table receives full Deal[] with no virtualization

**Severity:** Critical
**Estimated impact:** Rendering 10 000 table rows as DOM nodes with TanStack Table (no virtualization) will produce approximately 10 000 × (number of columns) DOM nodes. At 10 columns this is 100 000 DOM nodes — Chrome's DOM performance degrades sharply above 1 500 nodes. Initial render: 3–10 seconds. Scroll performance: <10 FPS (janky).

**Root cause:**
The architecture specifies "TanStack Table v8" for `DealsTable.tsx` but does not mention `@tanstack/react-virtual` (TanStack Virtual) for row virtualization. Without virtualization, TanStack Table renders every row in the DOM simultaneously, regardless of scroll position.

**Practical rendering limits without virtualization:**

| Row Count | DOM Nodes (10 cols) | Initial Render Time | Scroll Performance |
|---|---|---|---|
| 100 | 1 000 | <100 ms | Smooth |
| 500 | 5 000 | ~200 ms | Acceptable |
| 2 000 | 20 000 | 1–3 seconds | Degraded |
| 10 000 | 100 000 | 5–15 seconds | Unusable |

**Recommendation:**
Add `@tanstack/react-virtual` to dependencies. TanStack Table has a first-class integration. Virtualization renders only the visible rows (~20–30 at a time) regardless of dataset size.

```typescript
// /components/tables/DealsTable.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function DealsTable({ deals }: { deals: Deal[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const table = useReactTable({ data: deals, columns, /* ... */ })
  const { rows } = table.getRowModel()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,       // Estimated row height in px
    overscan: 10,                 // Render 10 extra rows above/below viewport
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]
          return (
            <div
              key={row.id}
              style={{
                position: 'absolute',
                top: virtualRow.start,
                height: virtualRow.size,
                width: '100%',
              }}
            >
              {/* render row cells */}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Note:** Add `@tanstack/react-virtual` to `package.json` dependencies.

---

### PERF-H3 — Recharts receives raw Deal[] data points instead of pre-aggregated summaries

**Severity:** High
**Estimated impact:** Recharts renders individual SVG elements per data point. Passing 10 000 deals to a `BarChart` as individual points produces 10 000 SVG `<rect>` elements, making the chart unresponsive and causing GC pressure. Charts become meaningless (bars for individual deals vs. aggregated stages) and crash the SVG renderer.

**Root cause:**
No data aggregation layer is described between Zustand `deals: Deal[]` and chart components. The architecture shows chart components (`PipelineChart.tsx`, `ForecastChart.tsx`, `SourcesChart.tsx`) receiving deal data but defines no transformer that groups deals by stage, source, or time bucket before charting.

**Recharts rendering limits:**

| Data Points | SVG Elements | Performance |
|---|---|---|
| 7 (one per stage) | ~50 SVG elements | Smooth |
| 100 | ~700 SVG elements | Acceptable |
| 1 000 | ~7 000 SVG elements | Slow (500+ ms render) |
| 10 000 | ~70 000 SVG elements | Browser crash likely |

**Recommendation:**
Create a pure transformer layer in `/lib/chart-data.ts` that pre-aggregates `Deal[]` into chart-ready data structures. Chart components receive `ChartData[]`, never `Deal[]`.

```typescript
// /lib/chart-data.ts
import { STAGE_PROBABILITIES } from './constants'

export interface PipelineChartPoint {
  stage: string
  rawValue: number
  weightedValue: number
  count: number
}

export function toPipelineChartData(deals: Deal[]): PipelineChartPoint[] {
  const byStage = new Map<string, { rawValue: number; weightedValue: number; count: number }>()

  for (const deal of deals) {
    const existing = byStage.get(deal.pipelineStage) ?? { rawValue: 0, weightedValue: 0, count: 0 }
    const prob = STAGE_PROBABILITIES[deal.pipelineStage] ?? 0
    byStage.set(deal.pipelineStage, {
      rawValue: existing.rawValue + deal.dealValue,
      weightedValue: existing.weightedValue + deal.dealValue * prob,
      count: existing.count + 1,
    })
  }

  return Array.from(byStage.entries()).map(([stage, data]) => ({ stage, ...data }))
}

// In PipelineChart.tsx — receives 7 data points max, not 10 000
export function PipelineChart({ deals }: { deals: Deal[] }) {
  const chartData = useMemo(() => toPipelineChartData(deals), [deals])
  return <BarChart data={chartData}>{/* ... */}</BarChart>
}
```

---

### PERF-H4 — Zustand store subscription pattern will cause full-store re-renders

**Severity:** High
**Estimated impact:** Without selector functions, every component that calls `useStore()` re-renders whenever any part of the store changes. With `deals`, `uploadedAt`, `setDeals`, and `clear` in one store, any update (including setting `uploadedAt`) forces all subscribed components to re-render — potentially every chart, table, and KPI card simultaneously.

**Root cause:**
The architecture shows the Zustand store shape but does not define selector functions. Without granular selectors, components will use `const { deals } = useDealsStore()` which subscribes to the entire store object.

**Recommendation:**
Define and enforce selector-based subscriptions. Zustand re-renders a component only when the selected slice changes.

```typescript
// /lib/store.ts — with canonical selectors
import { create } from 'zustand'

interface DealsStore {
  deals: Deal[]
  uploadedAt: Date | null
  status: 'idle' | 'parsing' | 'ready' | 'error'
  setDeals: (deals: Deal[]) => void
  clear: () => void
}

export const useDealsStore = create<DealsStore>((set) => ({
  deals: [],
  uploadedAt: null,
  status: 'idle',
  setDeals: (deals) => set({ deals, uploadedAt: new Date(), status: 'ready' }),
  clear: () => set({ deals: [], uploadedAt: null, status: 'idle' }),
}))

// /lib/selectors.ts — canonical selectors (referentially stable)
export const selectDeals = (s: DealsStore) => s.deals
export const selectHasData = (s: DealsStore) => s.deals.length > 0
export const selectStatus = (s: DealsStore) => s.status
export const selectOpenDeals = (s: DealsStore) =>
  s.deals.filter((d) => d.pipelineStage !== 'Closed Won' && d.pipelineStage !== 'Closed Lost')

// Usage in components — component only re-renders when deals array reference changes
const deals = useDealsStore(selectDeals)
const hasData = useDealsStore(selectHasData)
```

**Critical note on `selectOpenDeals`:** This selector creates a new array on every store update (because `filter` always returns a new reference). To stabilize this, use Zustand's `useShallow` or move derived data into the store as a computed property.

```typescript
// Stable version using zustand/shallow
import { useShallow } from 'zustand/react/shallow'

const openDeals = useDealsStore(
  useShallow((s) => s.deals.filter(isOpenDeal))
)
```

---

### PERF-M2 — Date calculations run on every render without any form of caching

**Severity:** Medium
**Estimated impact:** The "cold deal" check (`lastContactDate < today - 14 days`) and "untreated lead" check (`createdDate < today - 48h`) run per deal per render. At 10 000 deals on a page that renders 5 times per second during interaction, this is 50 000 date calculations per second — measurable CPU drain.

**Root cause:**
`date-fns` functions are pure and cheap individually, but being called in a loop across thousands of deals on every render (without `useMemo`) compounds rapidly. The architecture mentions these calculations in `PriorityActions.tsx` but defines no caching strategy.

**Recommendation:**
Wrap all O(n) deal scan calculations in `useMemo`. The `today` reference must be stable (not `new Date()` on every render, which always changes).

```typescript
// /lib/hooks/useAlerts.ts
import { useMemo } from 'react'
import { parseISO, differenceInDays, differenceInHours, isValid } from 'date-fns'
import { useDealsStore } from '@/lib/store'
import { selectDeals } from '@/lib/selectors'

const SESSION_START = new Date() // Module-level constant — stable for entire session

export function useAlerts() {
  const deals = useDealsStore(selectDeals)

  return useMemo(() => {
    const today = SESSION_START
    const coldDeals: Deal[] = []
    const untreatedLeads: Deal[] = []
    const quickWins: Deal[] = []

    for (const deal of deals) {
      const lastContact = parseISO(deal.lastContactDate)
      const created = parseISO(deal.createdDate)

      if (isValid(lastContact) && differenceInDays(today, lastContact) > 14 && deal.status !== 'Closed') {
        coldDeals.push(deal)
      }
      if (isValid(created) && differenceInHours(today, created) > 48 && deal.pipelineStage === 'Lead') {
        untreatedLeads.push(deal)
      }
      if (['Negotiation', 'Proposal Sent'].includes(deal.pipelineStage) && deal.dealValue >= QUICK_WIN_MIN_VALUE) {
        quickWins.push(deal)
      }
    }

    return { coldDeals, untreatedLeads, quickWins }
  }, [deals]) // Only recomputes when deals array changes
}
```

---

### PERF-M3 — Multiple pages recompute the same aggregations independently

**Severity:** Medium
**Estimated impact:** The home page, pipeline page, and forecast page all need weighted pipeline and forecast metrics. Without a shared memoization layer, navigating between pages triggers redundant full-array scans. At 10 000 deals: approximately 150–500 ms of redundant CPU work per navigation.

**Root cause:**
No shared hooks or computed value layer is defined. Each page component will independently import and call functions from `calculations.ts` against the same `Deal[]` array.

**Recommendation:**
All shared metrics must be computed once and memoized in a shared hook. Zustand's computed property pattern (or a Jotai-style derived atom) achieves this, but the simpler fix is a shared React hook at the page layout level that passes results down as props.

```typescript
// /lib/hooks/useSharedMetrics.ts — computed once at layout level
export function useSharedMetrics() {
  const deals = useDealsStore(selectDeals)

  const pipelineMetrics = useMemo(() => computePipelineMetrics(deals), [deals])
  const forecastMetrics = useMemo(() => computeForecastMetrics(deals), [deals])
  const alertMetrics = useMemo(() => computeAlerts(deals), [deals])

  return { pipelineMetrics, forecastMetrics, alertMetrics }
}

// app/layout.tsx (client boundary) — computed once for all child pages
// Pass via React context or Zustand derived slice
```

---

## Section 4 — Computation Performance

### PERF-H5 — Pipeline weight and forecast formulas are O(n) with no memoization guarantee

**Severity:** High
**Estimated impact:** `Σ (dealValue × STAGE_PROBABILITIES[stage])` iterates the full array. If called from three pages without memoization, a 10 000-deal dataset triggers three redundant O(n) passes per render cycle. In a worst-case interaction (rapid tab switching), this compounds to dozens of redundant scans per second.

**Root cause:**
`calculations.ts` contains pure functions, which is correct. However, the architecture does not define where or how these functions are memoized. Without explicit `useMemo` wrapping at the call site, React will re-execute them on every render, including renders triggered by unrelated state changes.

**Recommendation:**
Make all calculation functions accept `deals: Deal[]` as their sole input (already the case based on architecture description), then wrap every call site in `useMemo` with `[deals]` as the dependency.

```typescript
// /lib/calculations/pipeline.ts
export function computePipelineWeight(deals: Deal[]): number {
  return deals.reduce((sum, deal) => {
    const prob = STAGE_PROBABILITIES[deal.pipelineStage] ?? 0
    return sum + deal.dealValue * prob
  }, 0)
}

// Call site — memoized, only recomputes when deals reference changes
const pipelineWeight = useMemo(() => computePipelineWeight(deals), [deals])
```

**Additionally:** Zustand returns a new array reference whenever `setDeals` is called. As long as `setDeals` is only called on new CSV uploads (not on filter/sort interactions), the `[deals]` memo dependency will correctly invalidate once and cache thereafter.

---

### PERF-M4 — Deal velocity calculation is computationally expensive

**Severity:** Medium
**Estimated impact:** Deal velocity requires `differenceInDays(closedDate, createdDate)` for every closed deal, then a mean computation. This is O(n) but involves multiple `date-fns` calls per deal. Without memoization, this runs on every render of any component that displays velocity.

**Root cause:**
Velocity is listed as a key formula but is not given a dedicated hook or memoization strategy in the architecture.

**Recommendation:**

```typescript
// /lib/hooks/useDealVelocity.ts
import { useMemo } from 'react'
import { parseISO, differenceInDays, isValid } from 'date-fns'

export function useDealVelocity(deals: Deal[]) {
  return useMemo(() => {
    const closedWon = deals.filter((d) => d.pipelineStage === 'Closed Won')
    if (closedWon.length === 0) return null

    let totalDays = 0
    let validCount = 0

    for (const deal of closedWon) {
      const created = parseISO(deal.createdDate)
      const closed = parseISO(deal.lastContactDate) // Proxy for close date; document this
      if (isValid(created) && isValid(closed)) {
        totalDays += differenceInDays(closed, created)
        validCount++
      }
    }

    return validCount > 0 ? totalDays / validCount : null
  }, [deals])
}
```

---

## Section 5 — Bundle Size

### PERF-H6 — Recharts imported as a whole library rather than individual chart types

**Severity:** High
**Estimated impact:** Recharts v2 full bundle is approximately 150–180 KB gzipped. If imported as `import * from 'recharts'` or `import { BarChart, ... } from 'recharts'` without tree-shaking (Recharts v2 has partial tree-shaking support), the entire library ships to the client on first load. This adds 150+ KB to the initial JavaScript bundle, increasing Time to Interactive by 0.5–1.5 seconds on a 3G connection.

**Root cause:**
The architecture lists Recharts as a dependency and describes four chart types (`BarChart`, `AreaChart`, `PieChart`, `RadialBar`). No import strategy is defined. Recharts v2 does support named exports which enable tree-shaking, but only if the bundler is configured correctly and no barrel imports are used.

**Recommendation:**
Import only what is used. Verify with `@next/bundle-analyzer`.

```typescript
// Good — named imports, tree-shakeable
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Bad — imports entire library
import * as Recharts from 'recharts'
```

Additionally, lazy-load chart components since they are never needed on first paint (the CSV upload page is the first interaction):

```typescript
// app/pipeline/page.tsx
import dynamic from 'next/dynamic'

const PipelineChart = dynamic(
  () => import('@/components/charts/PipelineChart'),
  {
    ssr: false,                               // Charts are client-only
    loading: () => <ChartSkeleton />,         // Prevents layout shift
  }
)
```

This moves the Recharts bundle out of the initial load entirely. It is fetched only when the user navigates to a page that renders a chart.

---

### PERF-H7 — lucide-react is unpinned and tree-shaking is not guaranteed

**Severity:** High (combined with CQ-H5 from Phase 1)
**Estimated impact:** `lucide-react` at full bundle is approximately 40–60 KB gzipped. The library supports named icon imports for tree-shaking, but this requires the build system to correctly eliminate unused icons. Using `"latest"` as the version means the bundle size may change without notice on any `npm install`.

**Root cause:**
Architecture specifies `"lucide-react": "latest"` with no import strategy defined.

**Recommendation:**

```typescript
// Good — specific named import, tree-shakeable
import { TrendingUp, AlertCircle, Upload } from 'lucide-react'

// Bad — imports entire icon library
import * as Icons from 'lucide-react'
```

Pin the version:
```json
"lucide-react": "^0.460.0"
```

---

### PERF-M5 — date-fns v3 supports full tree-shaking but import patterns must be explicit

**Severity:** Medium
**Estimated impact:** date-fns v3 full bundle is approximately 75 KB gzipped. v3 ships as pure ESM with per-function tree-shaking. If any import path accidentally loads a CommonJS build or a barrel re-export, the full library ships.

**Recommendation:**

```typescript
// Good — explicit named imports from main package (ESM, tree-shakeable in v3)
import { differenceInDays, parseISO, isValid, format } from 'date-fns'

// Bad — v2-style subpath imports are not needed in v3 and may load CJS
import differenceInDays from 'date-fns/differenceInDays'
```

Verify tree-shaking is working by running `@next/bundle-analyzer`:

```json
// package.json devDependencies
"@next/bundle-analyzer": "^14.0.0"
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' })
module.exports = withBundleAnalyzer({})
```

---

### PERF-M6 — No code-splitting strategy defined for chart-heavy pages

**Severity:** Medium
**Estimated impact:** Next.js 14 App Router performs automatic per-route code splitting. However, if chart components are imported statically in page files, their bundles (Recharts + transformers) are included in the route's JavaScript chunk and loaded before the chart is visible. Dynamic imports defer this load.

**Recommendation:**
Apply `next/dynamic` to all chart components and to the `DealsTable` component (which includes TanStack Table). Use `ssr: false` since all data is client-side.

```typescript
// Pattern for all chart pages
const ForecastChart = dynamic(() => import('@/components/charts/ForecastChart'), { ssr: false })
const SourcesChart = dynamic(() => import('@/components/charts/SourcesChart'), { ssr: false })
const DealsTable = dynamic(() => import('@/components/tables/DealsTable'), { ssr: false })
```

---

## Section 6 — Network & Load Performance

### PERF-M7 — Initial page load strategy not defined — potential render-blocking scripts

**Severity:** Medium
**Estimated impact:** Without an explicit page load strategy, Next.js will include all imported JavaScript (Recharts, TanStack Table, date-fns, Zustand) in the initial JS bundle. On a 3G connection, a 400 KB+ initial bundle translates to 3–5 seconds before first interactivity.

**Root cause:**
The architecture's first page (`app/page.tsx`) shows "KPIs synthétiques + alertes + forecast rapide" — meaning it imports chart components and calculation functions on initial load. But the first user interaction is always the CSV upload, not viewing charts.

**Recommendation:**
Design the initial paint around the CSV upload flow. Split the app into two conceptual bundles:
1. **Pre-data shell** (fast): `CsvUploader`, layout, navigation — no charts, no table, no calculations
2. **Post-data view** (lazy-loaded after upload): All chart components, table, KPI cards

```typescript
// app/page.tsx — initial load is lightweight
export default function HomePage() {
  const hasData = useDealsStore(selectHasData)

  if (!hasData) {
    return <CsvUploaderScreen /> // Only this component loads initially
  }

  return <DashboardOverview /> // Lazy-loaded only after upload
}

// /components/dashboard/DashboardOverview.tsx — loaded dynamically
const DashboardOverview = dynamic(() => import('./DashboardOverviewContent'), {
  ssr: false,
  loading: () => <DashboardSkeleton />
})
```

This ensures users see the CSV upload interface in under 1 second regardless of connection speed.

---

### PERF-L1 — Vercel edge caching opportunities are absent (expected for client-side app)

**Severity:** Low
**Estimated impact:** Negligible for this architecture. Since this is a fully client-side data processing app with no server-side data fetching, Vercel edge caching applies only to static assets (JS/CSS chunks) and HTML shells. These are automatically cached by Vercel for Next.js static assets.

**Note:**
The one actionable Vercel optimization is ensuring long-lived cache headers are set for the Next.js JS/CSS chunk files. Next.js handles this automatically with content-hashed filenames. No additional configuration is needed.

**If V1 adds IndexedDB persistence (as roadmapped):** The persistence layer is entirely client-side and has no network implications. No edge function or API route is introduced.

---

### PERF-L2 — Lucide React icon loading strategy

**Severity:** Low
**Estimated impact:** Lucide React ships as ESM with per-icon tree-shaking. Each icon is approximately 0.5–2 KB. With correct named imports (see PERF-H7), this is negligible. Risk is only present if the entire library is accidentally imported.

**Recommendation:**
Enforce named-only imports via an ESLint rule:

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["lucide-react"],
        "importNames": ["*"],
        "message": "Use named icon imports from lucide-react, not wildcard imports."
      }]
    }]
  }
}
```

---

## Section 7 — Scalability Limits

The following table summarizes the practical breakdown point of each architectural component as dataset size grows.

| Component | Architecture As Described | Breakdown Threshold | Optimized Threshold |
|---|---|---|---|
| **PapaParse (sync, main thread)** | Blocks UI for entire parse | ~5 000 rows (2–4 s freeze) | ~100 000 rows (Web Worker) |
| **Zustand Deal[] in heap** | Full array in V8 heap | ~50 000 rows (OOM on mobile) | ~50 000 rows (with row gate) |
| **TanStack Table (no virtualization)** | Renders all DOM nodes | ~500 rows (jank), ~2 000 (unusable) | ~500 000 rows (with virtual) |
| **Recharts (raw data points)** | SVG per data point | ~1 000 data points (slow) | N/A — must pre-aggregate |
| **Recharts (pre-aggregated)** | 7 stages max per chart | Unlimited (always 7–12 points) | Same |
| **useMemo calculations (O(n))** | No memoization | Every render at any size | ~100 000 deals (once memoized) |
| **Date calculations (per-render)** | No caching | ~1 000 deals/re-render | ~100 000 deals (memoized) |
| **Lucide icons (named imports)** | Not specified | Negligible at any scale | Same |
| **Initial JS bundle (no lazy loading)** | All libraries on first load | Always slow (400+ KB) | <100 KB with dynamic imports |

---

## Prioritized Fix Roadmap

### Must Fix Before First Production User (MVP)

| ID | Issue | Fix |
|---|---|---|
| PERF-C1 | PapaParse blocks main thread | Add `worker: true` to PapaParse config |
| PERF-C2 | No file size or row count gate | Add size check before parse + `step` abort |
| PERF-C4 | TanStack Table without virtualization | Add `@tanstack/react-virtual` |
| PERF-H3 | Recharts receives raw Deal[] | Add `/lib/chart-data.ts` transformer layer |
| PERF-H4 | Zustand full-store re-renders | Define and enforce canonical selectors |

### Fix Before V1 (First Real Users)

| ID | Issue | Fix |
|---|---|---|
| PERF-H5 | Pipeline/forecast re-computed without memoization | Wrap all calculation call sites in `useMemo` |
| PERF-H6 | Recharts not lazy-loaded | Apply `next/dynamic` to all chart components |
| PERF-H2 | Date objects inflate heap | Store dates as ISO strings; parse lazily |
| PERF-M1 | Aggregations recomputed across pages | Implement `useSharedMetrics()` hook |
| PERF-M7 | Heavy initial bundle | Split pre-data / post-data load |

### Fix Before V2 (Scale / Multi-import)

| ID | Issue | Fix |
|---|---|---|
| PERF-C3 | Full Deal[] in heap with no eviction | Introduce `DealSummary` slim type |
| PERF-H1 | No progressive rendering during parse | Implement chunked parse with early `setDeals` |
| PERF-M5 | date-fns tree-shaking unverified | Add `@next/bundle-analyzer` to devDependencies |
| PERF-M6 | No code-splitting for chart pages | Apply `next/dynamic` to all heavy components |

---

## Summary of Findings

| Severity | Count | Primary Domains |
|---|---|---|
| Critical | 4 | CSV parsing (main thread block, no size gate), table DOM nodes, memory OOM |
| High | 7 | Chart data aggregation, Zustand re-renders, computation memoization, bundle size |
| Medium | 6 | Progressive parsing, date caching, shared metrics, code splitting, initial load |
| Low | 2 | Vercel caching (N/A), icon import enforcement |

The most immediately dangerous findings are **PERF-C1** (main thread CSV blocking), **PERF-C4** (unbounded DOM node creation in the table), and **PERF-H3** (raw deal data passed to Recharts). These three issues will produce hard, user-visible failures at 5 000–10 000 rows — a realistic CRM export size. All three have straightforward, low-effort mitigations that should be addressed before the first CSV is uploaded in production.
