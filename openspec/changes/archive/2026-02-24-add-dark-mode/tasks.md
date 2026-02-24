## 1. Dependencies & Configuration

- [x] 1.1 Install `next-themes` — run `npm install next-themes`
- [x] 1.2 Update `tailwind.config.ts` — add `darkMode: "class"` at the root of the config object
- [x] 1.3 Verify `globals.css` already has `:root` and `.dark` CSS variable blocks from shadcn/ui setup; add them if missing

## 2. ThemeProvider Setup

- [x] 2.1 Update `app/layout.tsx` — wrap `{children}` with `<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>` imported from `next-themes`
- [x] 2.2 Add `suppressHydrationWarning` to the `<html>` element in `app/layout.tsx` to suppress React hydration warnings caused by theme class injection

## 3. ThemeToggle Component

- [x] 3.1 Create `components/layout/ThemeToggle.tsx` — client component using `useTheme()` from `next-themes`, renders a `Button` (shadcn/ui, variant `ghost`, size `icon`) with `Sun` icon when dark and `Moon` icon when light
- [x] 3.2 Add `<ThemeToggle />` to the navbar in `app/layout.tsx` (or the shared nav component if one exists), positioned top-right

## 4. Audit Raw Color Utilities

- [x] 4.1 Search all files under `components/` for `bg-white` and replace with `bg-background` (shadcn/ui token) or add `dark:bg-gray-900` variant
- [x] 4.2 Search all files under `components/` for `bg-gray-` utilities and migrate to shadcn/ui semantic tokens (`bg-muted`, `bg-card`) or add explicit `dark:` variants
- [x] 4.3 Search all files under `components/` for `text-gray-900`, `text-gray-800`, `text-gray-700` and replace with `text-foreground` or add `dark:text-*` variants
- [x] 4.4 Search all files under `components/` for `text-gray-500`, `text-gray-400` and replace with `text-muted-foreground` or add `dark:text-*` variants
- [x] 4.5 Search all files under `app/` for the same raw color utilities and apply the same fixes
- [x] 4.6 Verify `components/upload/CsvUploader.tsx` drop zone border and background render correctly in dark mode
- [x] 4.7 Verify `components/alerts/PriorityActions.tsx` badge and alert colors render correctly in dark mode
- [x] 4.8 Verify `components/kpi/KpiCard.tsx` card background, value text, and delta indicator are legible in dark mode

## 5. Chart Dark Palette

- [x] 5.1 Add `CHART_COLORS_LIGHT` and `CHART_COLORS_DARK` palettes to `lib/constants.ts` — each is an array of hex strings suitable for Recharts fills/strokes on their respective backgrounds
- [x] 5.2 Update `components/charts/PipelineChart.tsx` — use `useTheme()` to select the correct color palette from constants; apply to bar/pie fill props
- [x] 5.3 Update `components/charts/ForecastChart.tsx` — use `useTheme()` to apply dark-mode stroke and fill colors to the AreaChart
- [x] 5.4 Update `components/charts/SourcesChart.tsx` — use `useTheme()` to apply dark-mode fill colors to the BarChart
- [x] 5.5 Verify Recharts axis tick text color (default dark) is overridden to a light color in dark mode via `tick={{ fill: ... }}` prop on `XAxis`/`YAxis`
- [x] 5.6 Verify Recharts `CartesianGrid` stroke color is softened in dark mode (e.g. `stroke="#374151"`)

## 6. Visual Verification (Playwright)

- [x] 6.1 Open the app in a browser and toggle to dark mode — visually check all 5 routes (/, /pipeline, /marketing, /forecast, /deals) for broken backgrounds, invisible text, or unreadable charts
- [x] 6.2 Reload the page in dark mode and confirm the theme persists without a flash of the light theme
- [x] 6.3 Run Playwright tests using `playwright-skill` to verify the toggle button is present and functional on each route
