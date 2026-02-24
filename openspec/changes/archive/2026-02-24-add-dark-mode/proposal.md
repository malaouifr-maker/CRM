## Why

The CRM dashboard currently has no dark mode, making it uncomfortable to use in low-light environments or for users who prefer dark interfaces. Adding a light/dark toggle is a high-visibility UX improvement with broad user demand and minimal risk.

## What Changes

- Add `next-themes` to manage theme state and persist user preference in `localStorage`
- Configure Tailwind CSS dark mode strategy (`class`-based) to enable dark variants
- Add a theme toggle button (sun/moon icon) in the top navigation bar
- Apply dark-mode-aware color tokens across all 5 routes and shared components (cards, charts, table, nav, upload area)

## Capabilities

### New Capabilities
- `theme-toggle`: Toggle UI component (button in navbar) allowing the user to switch between light and dark mode; preference persisted across sessions via `localStorage`
- `dark-theme`: Dark mode color scheme applied across all pages and components — backgrounds, text, borders, chart colors, shadcn/ui component overrides

### Modified Capabilities

_(none — existing specs are not impacted since no domain-level requirements change)_

## Impact

- **New dependency**: `next-themes` (lightweight, no conflicts with existing stack)
- **Config**: `tailwind.config.ts` → `darkMode: "class"`
- **Layout**: `app/layout.tsx` → wrap with `ThemeProvider`
- **Components affected**: all shared layout components (navbar, sidebar if any), KPI cards, pipeline charts, marketing charts, forecast charts, deals table, upload component
- **No breaking changes** to CSV parsing, Zustand store, business logic, or types
