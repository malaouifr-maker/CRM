# Phase 2: Security & Performance — Consolidated Report

**Target:** `ARCHITECTURE.md` — CRM Dashboard (Next.js 14, App Router)
**Date:** 2026-02-21
**Agents:** Security Auditor (Phase 2A) + Performance Engineering (Phase 2B)

---

## Part A — Security Audit

**Audit Type:** Pre-implementation architecture review
**Methodology:** STRIDE threat modeling + OWASP Top 10 mapping

### Risk Summary

| Severity | Count |
|---|---|
| Critical | 3 |
| High | 5 |
| Medium | 5 |
| Low | 3 |
| **Total** | **16** |

---

### Critical Findings

**SEC-C1 — CSV Injection / Formula Injection**
- CVSS 3.1: 8.6 | CWE-1236
- Location: `CsvUploader.tsx`, `csv-parser.ts`, `DealsTable.tsx`
- All string fields from the CSV (`firstName`, `lastName`, `email`, `company`, `industry`, `owner`, `tags`) pass directly to PapaParse with no sanitization. Fields beginning with `=`, `+`, `-`, `@` are formula injection vectors — especially relevant once V2 adds CSV/Excel export.
- Fix: Sanitize every string field in `csv-parser.ts` — strip leading formula characters, escape HTML entities in all string fields before storing in Zustand.

**SEC-C2 — Cross-Site Scripting (XSS) via CSV Content Rendering**
- CVSS 3.1: 8.1 | CWE-79
- Location: `DealsTable.tsx`, `KpiCard.tsx`, `PriorityActions.tsx`, all chart tooltip renderers
- CSV data is rendered across five views with no output encoding. Recharts custom tooltip renderers and TanStack Table cell renderers can execute arbitrary HTML. A `company` field containing `<img src=x onerror=fetch(...)>` will execute if rendered unsafely.
- Fix: Never use `dangerouslySetInnerHTML` on CSV-derived data. Add `"react/no-danger": "error"` ESLint rule. Use React's text-content rendering exclusively for user-supplied values.

**SEC-C3 — No Authentication or Authorization**
- CVSS 3.1: 9.1 | CWE-306, CWE-862
- Location: Entire application architecture
- The application is publicly accessible to anyone with the Vercel URL. With planned localStorage persistence, any subsequent user on a shared machine can access all previous deal data (PII + financial figures).
- Fix: Integrate NextAuth.js / Clerk / Auth0 before any data functionality is implemented. Add Next.js middleware to enforce authentication on all routes except the sign-in page.

---

### High Findings

**SEC-H1 — No File Upload Validation**
- CVSS 3.1: 7.5 | CWE-434, CWE-20
- No file extension check, no MIME type validation, no file size limit, no row count limit.
- Fix: Validate before PapaParse — accept only `.csv`, maximum 10 MB, maximum 50,000 rows. Reject files whose first bytes contain `{\rtf` (RTF magic bytes; the architecture explicitly mentions an RTF-encoded source file).

**SEC-H2 — PII Exposure in Client-Side Memory and Storage**
- CVSS 3.1: 7.1 | CWE-312, CWE-200
- `firstName`, `lastName`, `email`, `company`, `country`, `dealValue` stored unencrypted in the Zustand heap and planned for localStorage. GDPR Articles 5, 25, 32 require "appropriate security measures."
- Fix: Encrypt localStorage data via the Web Crypto API (AES-GCM). Clear on tab close (`beforeunload`). Evaluate whether PII fields are needed on the client at all, or can be summarized server-side.

**SEC-H3 — Missing Security Headers**
- CVSS 3.1: 6.1 | CWE-693, CWE-1021
- No CSP, no `X-Frame-Options`, no HSTS, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`.
- Fix: Add full security headers via `next.config.js` `headers()` configuration before first deployment.

**SEC-H4 — Unsafe Date Parsing and NaN Propagation**
- CVSS 3.1: 5.3 | CWE-704, CWE-252
- `new Date("31/12/2025")` returns `Invalid Date`, silently corrupting cold deal alerts, untreated lead calculations, 30/60/90-day forecasts, and deal velocity. NaN values propagate into aggregate calculations and chart rendering without any user-visible error.
- Fix: Use `date-fns` `parse()` with multiple format fallbacks. Return explicit `null` (not `Invalid Date`) for unparseable values. Validate with `isValid()` at every calculation site.

**SEC-H5 — Dependency Version Pinning and Supply Chain Risks**
- CVSS 3.1: 5.9 | CWE-1395
- `lucide-react: "latest"` is a supply chain risk. `next: "^14"` is exposed to known CVEs (CVE-2024-34351 SSRF, CVE-2025-29927 middleware auth bypass). `recharts: "^2"` had XSS tooltip vulnerabilities in older 2.x releases.
- Fix: Pin all dependencies to exact versions in `package.json`. Enable Dependabot or Snyk. Run `npm audit` in CI on every PR.

---

### Medium Findings

**SEC-M1 — Zustand Store Data Exposure via DevTools**
- CVSS 3.1: 4.3 | CWE-200
- The full `deals` array (including PII) is readable via React DevTools and the browser console in development and production builds.
- Fix: Disable Zustand devtools middleware in production builds: `process.env.NODE_ENV === 'development' && devtools(...)`.

**SEC-M2 — `dealValue` Parsing Without Validation**
- CVSS 3.1: 5.3 | CWE-20, CWE-681
- `"$50,000"` or `"50.000,00 EUR"` parse as `NaN`. Negative values and extreme values corrupt pipeline weight and forecast calculations silently.
- Fix: Implement a `parseDealValue()` function that strips non-numeric characters, rejects `NaN`/`Infinity`/negative values with explicit warnings.

**SEC-M3 — No CSP Nonce for Inline Script Protection**
- CVSS 3.1: 5.4 | CWE-693
- Next.js 14 App Router injects inline scripts for hydration. A blanket CSP blocking inline scripts will break the app without nonce support.
- Fix: Implement CSP nonces in `middleware.ts`. Set `Content-Security-Policy` header with `nonce-{random}` for `script-src`.

**SEC-M4 — RTF File as CSV Source**
- CVSS 3.1: 4.3 | CWE-436
- The architecture explicitly notes `Extraction.csv` is RTF-encoded. RTF control codes will be rendered as garbage field values in the UI and may interfere with parsing logic.
- Fix: Validate the first bytes of every uploaded file — reject files containing `{\rtf` magic bytes before passing to PapaParse.

**SEC-M5 — No Rate Limiting or Abuse Prevention**
- CVSS 3.1: 5.3 | CWE-770
- Rapid repeated uploads cause memory accumulation; no throttling on upload frequency or rows per second.
- Fix: Disable the upload button during parsing (use `status: 'parsing'` from the store). Clear Zustand before each new upload. Consider PapaParse streaming mode for large files.

---

### Low Findings

**SEC-L1 — Browser Extension Access to Deal Data**
- CVSS 3.1: 3.7 | CWE-829
- Malicious browser extensions can read the full Zustand store and intercept FileReader API calls. This is an inherent client-side risk.
- Fix: Mitigated primarily by a strong CSP. Document as a residual risk in the security policy.

**SEC-L2 — No Audit Logging**
- CVSS 3.1: 3.1 | CWE-778
- No record of who uploaded what data, when. Required for SOC 2, ISO 27001, and GDPR Article 30 Records of Processing Activities.
- Fix: Log upload timestamp, file SHA-256 hash, row count, and parsing error counts. Store in localStorage or send to a logging endpoint.

**SEC-L3 — No Data Lifecycle Management**
- CVSS 3.1: 2.4 | CWE-459
- The `clear()` function in Zustand is defined but no call is guaranteed. No TTL on persisted data.
- Fix: Call `clear()` on `beforeunload`. Add a 24-hour TTL to any localStorage data with a timestamp comparison on app startup.

---

### STRIDE Threat Model Summary

| Threat | Findings | Risk |
|---|---|---|
| Spoofing | SEC-C3 (No Auth) | Critical |
| Tampering | SEC-C1, SEC-C2, SEC-H4, SEC-M2 (Injection, XSS, Dates, dealValue) | Critical |
| Repudiation | SEC-L2 (No Logging) | Low |
| Information Disclosure | SEC-H2, SEC-M1, SEC-L1 (PII, DevTools, Extensions) | High |
| Denial of Service | SEC-H1, SEC-M5 (No File Validation, No Rate Limiting) | High |
| Elevation of Privilege | SEC-C3, SEC-H3 (No Auth, No Headers) | Critical |

---

### Security Remediation Roadmap

**Phase 0 — Before Any Code Is Written:**
- SEC-C3: Design authentication into the architecture
- SEC-H1: Define file validation requirements
- SEC-H3: Add `next.config.js` security headers

**Phase 1 — During MVP Development:**
- SEC-C1, SEC-C2: CSV field sanitization + ESLint `no-danger` rule
- SEC-H4: Robust date parsing with validation feedback
- SEC-H5: Pin all dependency versions; remove `lucide-react: "latest"`
- SEC-M2: Implement `parseDealValue()` parser
- SEC-M4: Magic-byte file content validation

**Phase 2 — Before V1 Release:**
- SEC-H2: Encrypt persisted data, data minimization
- SEC-M1: Disable devtools in production
- SEC-M3: CSP nonces for Next.js
- SEC-M5: Upload cooldown + streaming
- SEC-L2: Audit logging
- SEC-L3: Data TTL + session cleanup

---

## Part B — Performance & Scalability Analysis

### Risk Summary

| Severity | Count | Primary Domains |
|---|---|---|
| Critical | 4 | CSV parsing (main thread block, no size gate), table DOM nodes, memory OOM |
| High | 7 | Chart data aggregation, Zustand re-renders, computation memoization, bundle size |
| Medium | 7 | Progressive parsing, date caching, shared metrics, code splitting, initial load |
| Low | 2 | Vercel caching (N/A), icon import enforcement |
| **Total** | **20** | |

---

### Critical Findings

**PERF-C1 — PapaParse runs synchronously on the main thread**
- Impact: UI freeze of 2–8 seconds for a 10,000-row CSV on a mid-range laptop. Tab unresponsive at 50,000+ rows.
- The architecture specifies PapaParse v5 with no mention of `worker: true`. Default execution blocks the entire JavaScript event loop during parsing.
- Fix: Enable `worker: true` in the PapaParse config (one-line change; PapaParse bundles its own worker).

**PERF-C2 — No file size or row count gate before parsing begins**
- Impact: A 500 MB CSV will attempt to load entirely into the V8 heap, crashing the tab with no user feedback.
- No `maxFileSize` or `maxRowCount` constant is defined. `CsvUploader.tsx` will accept any file.
- Fix: Implement a two-tier gate — (1) file size check before parsing (`MAX_FILE_SIZE_BYTES = 10 MB`), (2) PapaParse `step` callback to abort at `MAX_ROW_COUNT = 50,000`.

**PERF-C3 — Entire Deal[] array held in Zustand in-memory store with no eviction**
- Impact: A 50,000-row dataset with 30 fields per row occupies approximately 60–120 MB of V8 heap for the entire session. Tab crash risk on mobile devices.
- Fix: For MVP (≤10,000 rows): enforce row count gate from PERF-C2. For V2: introduce a `DealSummary` slim type for Zustand; lazy-load full `Deal` records for the table view on demand.

**PERF-C4 — TanStack Table receives full Deal[] with no virtualization**
- Impact: 10,000 rows × 10 columns = 100,000 DOM nodes. Chrome degrades sharply above 1,500 nodes. Initial render: 5–15 seconds. Scroll performance: <10 FPS.
- Fix: Add `@tanstack/react-virtual`. TanStack Table has a first-class integration. Renders only ~20–30 visible rows regardless of dataset size.

---

### High Findings

**PERF-H1 — No streaming/chunked parse for progressive rendering**
- Impact: User sees a blank/loading state for the entire parse duration. For a 5,000-row file: 500 ms–2 s of perceived inactivity.
- Fix: Use PapaParse `chunk` callback to load the first 500 rows immediately for fast initial paint, then continue ingesting in the background.

**PERF-H2 — Date objects parsed per Deal increase memory footprint**
- Impact: Three `Date` objects per deal × 50,000 rows = 150,000 heavyweight Date allocations; increases GC pause frequency.
- Fix: Store dates as ISO strings in Zustand. Convert to `Date` objects lazily at calculation sites only (also fixes SEC-H2 JSON serialization).

**PERF-H3 — Recharts receives raw Deal[] data points instead of pre-aggregated summaries**
- Impact: 10,000 deals passed to a BarChart produces 10,000 SVG `<rect>` elements — browser crash likely. Charts also become semantically meaningless (per-deal bars vs. per-stage bars).
- Fix: Create `/lib/chart-data.ts` with pure transformer functions. Chart components receive `ChartData[]` (7 stage buckets max), never `Deal[]`.

**PERF-H4 — Zustand store subscription pattern will cause full-store re-renders**
- Impact: Without selector functions, every component that calls `useStore()` re-renders whenever any part of the store changes. All charts, tables, and KPI cards re-render simultaneously on any state mutation.
- Fix: Define and enforce canonical selectors (`selectDeals`, `selectOpenDeals`, `selectHasData`, `selectStatus`). Use Zustand's `useShallow` for derived array selectors.

**PERF-H5 — Pipeline weight and forecast formulas are O(n) with no memoization guarantee**
- Impact: Three pages computing independent O(n) aggregations on every render = dozens of redundant full-array scans per second during interaction.
- Fix: All calculation functions accept `deals: Deal[]` as input; wrap every call site in `useMemo([deals])`.

**PERF-H6 — Recharts imported as whole library rather than individual chart types**
- Impact: Recharts v2 full bundle is approximately 150–180 KB gzipped. Without lazy loading, this ships to the client on first load, adding 0.5–1.5 seconds Time to Interactive on 3G.
- Fix: Use named imports for tree-shaking. Apply `next/dynamic` with `ssr: false` to all chart components.

**PERF-H7 — lucide-react is unpinned and tree-shaking is not guaranteed**
- Impact: Full `lucide-react` bundle is approximately 40–60 KB gzipped. Version `"latest"` means bundle size may change without notice on any `npm install`.
- Fix: Pin version (`"^0.460.0"`). Use only named icon imports.

---

### Medium Findings

**PERF-M1 — No derived data caching — aggregations recomputed from raw array every render**
- Each of five pages runs its own O(n) aggregations. At 10,000 deals: 50–200 ms computation before first meaningful paint per page.
- Fix: Canonical memoized hooks: `usePipelineMetrics()`, `useForecastMetrics()`, `useAlerts()`.

**PERF-M2 — Date calculations run on every render without caching**
- Cold deal and untreated lead checks run per deal per render. At 10,000 deals at 5 re-renders/second: 50,000 date calculations per second.
- Fix: Wrap all O(n) date scans in `useMemo`. Use a module-level `SESSION_START = new Date()` constant instead of `new Date()` per render.

**PERF-M3 — Multiple pages recompute the same aggregations independently**
- Home page, pipeline page, and forecast page each compute weighted pipeline and forecast metrics independently. Navigation triggers redundant O(n) scans.
- Fix: `useSharedMetrics()` hook at layout level; pass results via React context or derived Zustand slice.

**PERF-M4 — Deal velocity calculation is computationally expensive**
- Velocity requires `differenceInDays` for every closed deal + mean computation. Without memoization, this runs on every render of any velocity-displaying component.
- Fix: `useDealVelocity()` hook with `useMemo([deals])` dependency.

**PERF-M5 — date-fns v3 tree-shaking not verified**
- date-fns v3 is ESM-only; accidental CJS import paths load the full ~75 KB gzipped bundle.
- Fix: Use named imports from main package only. Verify with `@next/bundle-analyzer`.

**PERF-M6 — No code-splitting strategy defined for chart-heavy pages**
- Static imports of chart components include their bundles in the route's initial chunk.
- Fix: Apply `next/dynamic` to all chart components and to `DealsTable`.

**PERF-M7 — Initial page load strategy not defined — potential render-blocking scripts**
- First page (`app/page.tsx`) imports chart components and calculation functions on initial load. But the first user interaction is always the CSV upload, not chart viewing.
- Fix: Design initial paint around the CSV upload shell only. Load chart/table/KPI components dynamically after upload completes.

---

### Low Findings

**PERF-L1 — Vercel edge caching (expected for client-side app)**
- No action needed. Next.js automatically sets long-lived cache headers for content-hashed JS/CSS chunks. No edge function or API route is involved.

**PERF-L2 — Lucide React icon loading strategy**
- With correct named imports, each icon is ~0.5–2 KB. Risk is negligible unless wildcard import is used.
- Fix: Enforce named-only imports via ESLint `no-restricted-imports` rule.

---

### Performance Scalability Limits

| Component | Current Architecture | Breakdown Threshold | Optimized Threshold |
|---|---|---|---|
| PapaParse (sync, main thread) | Blocks UI for entire parse | ~5,000 rows (2–4 s freeze) | ~100,000 rows (Web Worker) |
| Zustand Deal[] in heap | Full array in V8 heap | ~50,000 rows (OOM on mobile) | ~50,000 rows (with row gate) |
| TanStack Table (no virtualization) | Renders all DOM nodes | ~500 rows (jank), ~2,000 (unusable) | ~500,000 rows (with virtual) |
| Recharts (raw data points) | SVG per data point | ~1,000 data points (slow) | N/A — must pre-aggregate |
| Recharts (pre-aggregated) | 7 stages max per chart | Unlimited | Same |
| useMemo calculations (O(n)) | No memoization | Every render at any size | ~100,000 deals (once memoized) |
| Initial JS bundle (no lazy loading) | All libraries on first load | Always slow (400+ KB) | <100 KB with dynamic imports |

---

### Performance Remediation Roadmap

**Must Fix Before First Production User (MVP):**

| ID | Issue | Fix |
|---|---|---|
| PERF-C1 | PapaParse blocks main thread | Add `worker: true` to PapaParse config |
| PERF-C2 | No file size or row count gate | Add size check before parse + `step` abort |
| PERF-C4 | TanStack Table without virtualization | Add `@tanstack/react-virtual` |
| PERF-H3 | Recharts receives raw Deal[] | Add `/lib/chart-data.ts` transformer layer |
| PERF-H4 | Zustand full-store re-renders | Define and enforce canonical selectors |

**Fix Before V1 (First Real Users):**

| ID | Issue | Fix |
|---|---|---|
| PERF-H5 | Pipeline/forecast re-computed without memoization | Wrap all calculation call sites in `useMemo` |
| PERF-H6 | Recharts not lazy-loaded | Apply `next/dynamic` to all chart components |
| PERF-H2 | Date objects inflate heap | Store dates as ISO strings; parse lazily |
| PERF-M1 | Aggregations recomputed across pages | Implement `useSharedMetrics()` hook |
| PERF-M7 | Heavy initial bundle | Split pre-data / post-data load |

**Fix Before V2 (Scale / Multi-import):**

| ID | Issue | Fix |
|---|---|---|
| PERF-C3 | Full Deal[] in heap with no eviction | Introduce `DealSummary` slim type |
| PERF-H1 | No progressive rendering during parse | Implement chunked parse with early `setDeals` |
| PERF-M5 | date-fns tree-shaking unverified | Add `@next/bundle-analyzer` to devDependencies |
| PERF-M6 | No code-splitting for chart pages | Apply `next/dynamic` to all heavy components |

---

## Cross-Cutting Themes

Several findings in security and performance reinforce each other:

1. **File validation** (SEC-H1 / PERF-C2): Both require a pre-parse size + type gate — implement once in `csv-parser.ts`.
2. **Date handling** (SEC-H4 / PERF-H2): Store as ISO strings (performance) and validate on parse (security) — same code path.
3. **Dependency pinning** (SEC-H5 / PERF-H7): `lucide-react: "latest"` is both a supply chain risk and a bundle size risk — same fix (pin version).
4. **No input validation** (SEC-C1, SEC-C2 / PERF-C2): CSV field sanitization and file gates are both addressed in the `csv-parser.ts` mapping layer.
5. **Authentication gap** (SEC-C3): This is the single highest-impact finding in the entire review. Without auth, all performance and security optimizations are moot if data can be accessed without credentials.
