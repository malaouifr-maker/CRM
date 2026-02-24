## Context

The dashboard is a Next.js 14 App Router app styled with Tailwind CSS v3 and shadcn/ui components. It currently has no theming system — all colors are hardcoded light-mode values. Adding dark mode requires: (1) a theme management mechanism, (2) a Tailwind strategy switch, and (3) consistent dark-variant coverage across every component.

The app is 100% client-side. There is no server session to persist preferences, so `localStorage` is the correct persistence layer.

## Goals / Non-Goals

**Goals:**
- User can toggle light ↔ dark mode from the navbar
- Preference is persisted across page reloads and navigation
- All 5 routes render correctly in both modes (no flash of wrong theme)
- shadcn/ui components adapt automatically via CSS variables
- Charts (Recharts) are readable in both modes

**Non-Goals:**
- System preference auto-detection (can be added later via `next-themes` `defaultTheme: "system"`)
- Per-route or per-component theme override
- Custom branded themes beyond light/dark
- Accessibility audit of color contrast ratios (tracked separately)

## Decisions

### 1. Use `next-themes` over a custom Zustand-based solution
`next-themes` handles SSR/hydration safely with a script injected before React hydrates, preventing the flash of wrong theme. A manual Zustand approach would require custom hydration guards. `next-themes` integrates directly with Tailwind's `class` strategy by toggling `dark` on `<html>`.

_Alternative considered_: Manage theme in Zustand + `useEffect` to set class — rejected because it causes a visible flash on first load.

### 2. Tailwind `darkMode: "class"` strategy
The `class` strategy (vs. `media`) gives the user explicit control regardless of OS preference. It pairs naturally with `next-themes`'s `attribute="class"` prop.

### 3. shadcn/ui CSS variables handle most component colors automatically
shadcn/ui uses CSS custom properties (`--background`, `--foreground`, `--muted`, etc.) scoped under `:root` and `.dark`. Setting `darkMode: "class"` in Tailwind means switching `.dark` on `<html>` automatically updates all shadcn/ui components without manually patching each one.

Manual overrides will only be needed for:
- Custom components not using shadcn/ui tokens (inline `bg-white`, `text-gray-*`)
- Recharts chart colors (hardcoded hex values in chart config)

### 4. Chart colors: explicit dark palette in chart config constants
Recharts colors are passed as props (not CSS classes), so they won't respond to Tailwind dark variants. The solution is to read the current theme with `useTheme()` and switch between two color palettes defined in `lib/constants.ts`.

_Alternative considered_: CSS `currentColor` trick — not reliable for Recharts fill/stroke props.

### 5. `ThemeToggle` component placed in shared navbar
A single `<ThemeToggle>` component (`components/layout/ThemeToggle.tsx`) using `useTheme()` from `next-themes`, rendering a `Sun` / `Moon` Lucide icon button. Placed in the top-right of the existing navbar.

## Risks / Trade-offs

- **Hydration mismatch** → `next-themes` injects a blocking script before React hydrates to set the correct class; using `suppressHydrationWarning` on `<html>` avoids React warnings. Must be applied correctly.
- **Chart readability in dark mode** → Recharts uses hardcoded fill colors. If only some charts are updated, inconsistency will be visible. All chart configs must be audited. → Mitigation: enumerate every chart component in tasks.
- **`bg-white` / `text-gray-*` stragglers** → Any component using raw Tailwind color utilities instead of shadcn/ui semantic tokens will break in dark mode. → Mitigation: grep for `bg-white`, `bg-gray-`, `text-gray-` in components and migrate to semantic tokens or add `dark:` variants.

## Migration Plan

1. `npm install next-themes`
2. Update `tailwind.config.ts`: add `darkMode: "class"`
3. Update `app/layout.tsx`: wrap children with `<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>`
4. Create `components/layout/ThemeToggle.tsx`
5. Add `<ThemeToggle>` to navbar
6. Audit and patch raw color utilities in all components
7. Update Recharts color configs to support dark palette

No rollback risk — the change is purely additive (new dependency + CSS class toggles). Reverting means removing `ThemeProvider` and `darkMode: "class"`.

## Open Questions

- Should `defaultTheme` be `"light"` (explicit, matches current app) or `"system"` (respects OS preference)? → Decision deferred; default to `"light"` for MVP, easy to change later.
- Are there any SVG illustrations or images that need dark variants? → Needs visual audit during implementation.
