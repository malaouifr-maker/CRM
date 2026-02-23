# Phase 1: Code Quality & Architecture Review

---

## Code Quality Findings

### Critical

**CQ-C1 — No error handling strategy**
- Location: Architecture-wide (absent)
- The architecture contains zero mention of error handling, error boundaries, loading states, or empty states. Failure modes include: non-CSV file uploads, missing CSV columns, corrupt date fields, empty CSVs, large files freezing the UI, `dealValue` with currency symbols causing `NaN`.
- Fix: Define a `ParseResult` type `{ deals: Deal[], errors: FieldError[], warnings: string[] }`, add `status: 'idle' | 'parsing' | 'ready' | 'error'` to the Zustand store, add React Error Boundary at layout level.

**CQ-C2 — No data persistence in MVP — data lost on page refresh**
- Location: `/lib/store.ts`, Roadmap section
- Zustand is in-memory only. Every page refresh loses all data. Retroactively adding persistence is non-trivial because `Date` objects do not survive `JSON.stringify` without custom handling.
- Fix: Use Zustand `persist` middleware from day one. Store dates as ISO strings internally, convert in selectors.

---

### High

**CQ-H1 — `calculations.ts` will become a monolith**
- Location: `/lib/calculations.ts`
- Six distinct business domains (pipeline weighting, 30/60/90j forecast, deal velocity, cold deals, untreated leads, quick wins) in one file. Will be the most-changed and most-conflicted file as the product grows.
- Fix: Split into domain modules: `pipeline.ts`, `forecast.ts`, `velocity.ts`, `alerts.ts`, `index.ts`.

**CQ-H2 — `CsvUploader.tsx` mixes UI, parsing, validation, and state mutation**
- Location: `/components/upload/CsvUploader.tsx`
- Violates Single Responsibility Principle. Will be 200+ lines mixing DOM events, async parsing, data transformation, error management, and Zustand mutations.
- Fix: Separate into `CsvUploader.tsx` (UI only), `csv-parser.ts` (all parsing/validation/mapping), and `useCsvImport.ts` (orchestration hook).

**CQ-H3 — No shared data transformation/selector layer**
- Location: Architecture-wide (between `/lib` and `/components`)
- Multiple pages need filtered subsets of the same `Deal[]` array. Without shared selectors, each page will re-implement filtering logic independently.
- Fix: Introduce `/lib/selectors.ts` with canonical selectors: `selectOpenDeals`, `selectColdDeals`, `selectUntreatedLeads`, `selectQuickWins`.

**CQ-H4 — Date fields typed as `Date` but sourced as strings from CSV**
- Location: `/types/deal.ts`, `/lib/csv-parser.ts`
- PapaParse returns strings. No conversion strategy is defined. `Invalid Date` will silently poison all date-fns calculations.
- Fix: Define `RawCsvRow` (all strings) and `Deal` (typed) as separate types. Use `date-fns/parse` in the mapping step. Validate with `isValid()`. Define expected date format in `constants.ts`.

**CQ-H5 — `lucide-react: "latest"` breaks build reproducibility**
- Location: `package.json` dependencies
- Unpins from a specific version — every `npm install` can pull a breaking change silently.
- Fix: Pin to specific caret range e.g. `"^0.460.0"`.

**CQ-H6 — No testing strategy**
- Location: Architecture-wide (absent from devDependencies)
- No unit tests for calculations, no CSV parsing integration tests, no component tests. `devDependencies` only lists `typescript` and `@types/papaparse`.
- Fix: Add `vitest`, `@testing-library/react`. Write tests for `/lib/calculations.ts` with CSV fixture files before V1.

---

### Medium

**CQ-M1 — KPI computation will be duplicated across pages**
- Location: `app/page.tsx`, `app/pipeline/page.tsx`, `app/forecast/page.tsx`
- Weighted pipeline and forecast summaries needed on multiple pages. No shared hooks pattern defined.
- Fix: Create `usePipelineMetrics()`, `useForecastMetrics()` custom hooks with `useMemo`.

**CQ-M2 — Chart components will duplicate data transformation logic**
- Location: `/components/charts/*`
- Each chart needs `Deal[]` → Recharts-compatible array transformations. No shared transformer layer described.
- Fix: Create `/lib/chart-data.ts` with pure transformer functions.

**CQ-M3 — "Cold deal" and "untreated lead" logic will be duplicated**
- Location: `PriorityActions.tsx`, `app/page.tsx`, `app/pipeline/page.tsx`
- Same detection logic needed in multiple places.
- Fix: Covered by `selectColdDeals` / `selectUntreatedLeads` selectors (see CQ-H3).

**CQ-M4 — Zustand store violates Interface Segregation**
- Location: `/lib/store.ts`
- Every component subscribes to the full store and receives the entire `Deal[]` array, causing unnecessary re-renders.
- Fix: Document and enforce Zustand selector pattern from day one.

**CQ-M5 — No dependency inversion for CSV parsing**
- Location: `/lib/csv-parser.ts`
- Direct coupling to PapaParse makes it hard to swap parsers for Excel, API, etc. in V2.
- Fix: Define `DataParser = (input: File | string) => Promise<ParseResult>` interface. Future parsers implement the same contract.

**CQ-M6 — "Quick win" threshold is undefined**
- Location: Business formulas section
- `dealValue élevé` is vague and will be hardcoded as an undiscoverable arbitrary constant.
- Fix: Define `QUICK_WIN_MIN_VALUE` in `constants.ts`. Document business rationale.

**CQ-M7 — `tags: string[]` has no parsing strategy**
- Location: `/types/deal.ts`, `/lib/csv-parser.ts`
- CSV cells are flat strings. No delimiter specified for splitting into arrays.
- Fix: Document expected delimiter in `constants.ts`. Implement split with fallback to `[]` in csv-parser.

**CQ-M8 — No schema versioning for future persistence**
- Location: `/lib/store.ts`, Roadmap V1/V2
- When V1 adds persistence and V2 changes the store shape, existing persisted data will break deserialization silently.
- Fix: Add `schemaVersion: number` to the store from MVP. Add migration function on load.

---

### Low

**CQ-L1 — `leadSource` union type collapses to `string`**
- Location: `/types/deal.ts`
- `'Website' | 'LinkedIn' | ... | string` makes the named variants provide zero type safety.
- Fix: Use `KnownLeadSource | (string & {})` pattern to preserve autocomplete while accepting unknowns.

**CQ-L2 — No i18n/locale consideration for CSV values**
- Location: Architecture-wide
- Date formats (`dd/MM/yyyy` vs `MM/dd/yyyy`) and number formats (`10.000,50` vs `10000.50`) are not addressed. French CRM exports may differ from US format assumptions.
- Fix: Document expected CSV locale in `constants.ts`. Use locale-aware parsing for `dealValue`.

---

## Architecture Findings

### Critical

**AR-C1 — Date fields will be strings after CSV parse, not `Date` objects**
- Location: `/types/deal.ts`, `/lib/csv-parser.ts`
- PapaParse does not coerce dates. `createdDate`, `lastContactDate`, `nextFollowupDate` declared as `Date` but will be strings at runtime. All date-fns calculations will silently produce wrong results or throw.
- Fix: Define `RawCsvRow` (all strings) vs `Deal` (typed). Parse dates explicitly in `csv-parser.ts` mapping. Validate with `isValid()`. Reject or flag rows with invalid dates.

---

### High

**AR-H1 — No computed/derived data layer (memoization strategy undefined)**
- Location: Architecture-wide — between `/lib` and page components
- No explicit strategy for how calculated values (pipeline weight, forecast, velocity) are cached. Each page will independently implement `useMemo` or recompute on every render.
- Fix: Create custom hooks (`usePipelineMetrics`, `useForecastMetrics`) that wrap `useMemo` around pure calculation functions. All calculation functions should accept `deals: Deal[]` as a parameter.

**AR-H2 — In-memory model has no upper bound or Web Worker strategy**
- Location: Architecture — PapaParse usage, Zustand store
- PapaParse runs synchronously on the main thread. A 50K-row CSV will freeze the UI for several seconds. No file size limits or row count warnings described.
- Fix: Use PapaParse `worker: true` option (one-line config). Add file size / row count warning in uploader. Aggregate data before passing to Recharts.

**AR-H3 — Deal interface conflates Lead and Deal domain concepts**
- Location: `/types/deal.ts`
- `firstName/lastName/email` are contact attributes; `dealValue/pipelineStage` are deal attributes. `pipelineStage` includes `'Lead'` making the boundary ambiguous.
- Fix: Document that `Deal` is a "raw CSV row representation" not a domain entity. For V1+, introduce derived view types (`LeadView`, `DealView`) computed from the base type.

---

### Medium

**AR-M1 — Flat component directory vs feature-based colocation**
- Location: `/components` directory structure
- Technical-role grouping (charts, tables, kpi) becomes ambiguous as feature count grows. Doesn't align with Next.js App Router colocation conventions.
- Fix: Keep truly shared primitives in `/components/shared`. Co-locate route-specific components in `app/[route]/_components/`.

**AR-M2 — Missing `error.tsx` / `loading.tsx` App Router primitives**
- Location: `/app` directory structure
- No error boundaries or loading states planned. CSV parsing can fail in numerous ways.
- Fix: Add `error.tsx` at root layout level. Add `loading.tsx` for the deals table route. Add error boundary around CSV upload flow.

**AR-M3 — Missing ESLint, Prettier, @types/react in devDependencies**
- Location: `package.json` devDependencies
- No code quality enforcement tools. `@types/react` and `@types/react-dom` are absent — required for TypeScript + React.
- Fix: Add `eslint`, `eslint-config-next`, `prettier`, `@types/react`, `@types/react-dom`.

**AR-M4 — No ID generation strategy for Deal records**
- Location: `/types/deal.ts` — `id: string`
- CSV exports may or may not include a unique ID column. No fallback strategy defined. Unstable IDs will break V2 multi-import comparison.
- Fix: Map from CRM ID column if present. Otherwise generate a deterministic hash from `email + company + createdDate` composite key.

**AR-M5 — CSV parser has no error contract defined**
- Location: `/lib/csv-parser.ts`
- The wrapper has no defined return type for partial failures. UI has no way to show meaningful feedback about skipped rows.
- Fix: Define `ParseResult = { deals: Deal[], warnings: ParseWarning[], errors: ParseError[], totalRows: number, successfulRows: number }`.

**AR-M6 — Server vs Client Component boundary not defined**
- Location: `/app` directory, all page and component files
- All pages will need `'use client'` or client component children. Not addressed in architecture. `layout.tsx` sidebar/nav CAN remain a Server Component.
- Fix: Explicitly define: `layout.tsx` = Server Component; chart/table/KPI components = Client Components with `'use client'`; page.tsx files = Server Components composing client children.

**AR-M7 — Date objects not JSON-serializable — persistence will break**
- Location: `/lib/store.ts`
- `Date` fields don't survive `JSON.stringify`/`JSON.parse` without custom handling. Persistence in V1 will require a full serialization rework if not planned now.
- Fix: Store dates as ISO strings in Zustand. Convert to `Date` objects in selectors/hooks. Design for this from MVP.

**AR-M8 — Store shape doesn't anticipate V2 multi-import**
- Location: `/lib/store.ts`, Roadmap V2
- Current shape `{ deals: Deal[] }` only holds one import. Multi-import comparison requires `{ imports: { id, uploadedAt, deals }[] }`.
- Fix: Design calculation functions as pure functions accepting `deals: Deal[]`. This makes them reusable for any import without refactoring.

**AR-M9 — No selector definitions for Zustand store**
- Location: `/lib/store.ts`
- No canonical selectors defined. Components will define ad-hoc inline selectors with inconsistent memoization.
- Fix: Define and export canonical selectors alongside the store: `selectDeals`, `selectOpenDeals`, `selectHasData`, `selectUploadedAt`.

**AR-M10 — No loading/error state in the store**
- Location: `/lib/store.ts`
- Store has no `status` or `error` fields. UI cannot distinguish between idle, parsing, ready, and error states.
- Fix: Add `status: 'idle' | 'parsing' | 'ready' | 'error'` and `error: string | null` to store shape.

---

### Low

**AR-L1 — `/lib` mixes infrastructure and domain logic**
- Location: `/lib` directory
- `csv-parser.ts` (I/O adapter), `calculations.ts` (domain logic), `store.ts` (application state), `constants.ts` (config) all in one flat directory. Acceptable at MVP scale.
- Fix: No immediate action. For V2, consider `/lib/infra`, `/lib/domain`, `/lib/state` split.

**AR-L2 — `leadSource` union escape hatch weakens type safety**
- Location: `/types/deal.ts`
- Same as CQ-L1. Use `KnownLeadSource | (string & {})` pattern.

**AR-L3 — No page metadata exports**
- Location: `/app/*/page.tsx` files
- No `metadata` exports for page titles. Low priority for internal tool.
- Fix: Add simple `export const metadata = { title: 'Pipeline | CRM Dashboard' }` to each page.

---

## Critical Issues for Phase 2 Context

The following findings from Phase 1 should directly inform the Security and Performance review:

1. **No input validation on CSV upload** — The absence of any error handling means there is also no validation of uploaded files. Malformed CSV content (or non-CSV files) passes directly to PapaParse and then to the store with no sanitization. This is a potential XSS vector if any field content is rendered as raw HTML.

2. **`dealValue` parsed from string with no sanitization** — If `dealValue` contains formulas (e.g., `=CMD()` from CSV injection), these must never be written to the DOM or evaluated.

3. **PapaParse runs on the main thread** — For very large CSVs, this blocks the entire browser tab. A performance-critical path with no mitigation strategy.

4. **Date fields silently fail** — Any downstream calculation using `Invalid Date` will produce `NaN`, which can cause division-by-zero or infinite values in aggregate calculations rendered in charts.

5. **No rate limiting or file size restrictions on uploads** — An arbitrarily large file can be uploaded, causing a memory exhaustion scenario in the browser.
