## ADDED Requirements

### Requirement: All pages render correctly in dark mode
Every route in the application SHALL be fully usable in dark mode with no unreadable text, invisible elements, or broken layouts.

#### Scenario: Home page in dark mode
- **WHEN** dark mode is active AND the user is on the home page (/)
- **THEN** KPI cards, alert panels, and quick forecast section SHALL all display with legible text and appropriate background contrast

#### Scenario: Pipeline page in dark mode
- **WHEN** dark mode is active AND the user is on /pipeline
- **THEN** pipeline value cards, stage breakdown, and cold deals panel SHALL render with correct dark backgrounds and legible text

#### Scenario: Marketing page in dark mode
- **WHEN** dark mode is active AND the user is on /marketing
- **THEN** lead source charts and conversion rate panels SHALL be fully visible and readable

#### Scenario: Forecast page in dark mode
- **WHEN** dark mode is active AND the user is on /forecast
- **THEN** 30/60/90-day forecast panels and scenario cards SHALL render with correct contrast

#### Scenario: Deals table in dark mode
- **WHEN** dark mode is active AND the user is on /deals
- **THEN** the table header, rows, filters, and pagination controls SHALL all render with legible text and visible borders

---

### Requirement: Shared UI components adapt to dark mode
All shared layout components (navbar, page wrapper, cards) SHALL use dark-mode-aware color tokens and render correctly in both themes.

#### Scenario: Navbar dark mode
- **WHEN** dark mode is active
- **THEN** the navbar background SHALL be dark and navigation links SHALL be legible

#### Scenario: KPI cards dark mode
- **WHEN** dark mode is active
- **THEN** KPI card backgrounds SHALL be dark and value/label text SHALL meet readable contrast

#### Scenario: CSV upload area dark mode
- **WHEN** dark mode is active AND no data has been uploaded
- **THEN** the upload drop zone SHALL render with a dark background and visible border/instruction text

---

### Requirement: Charts are readable in dark mode
All Recharts charts SHALL render with a color palette appropriate for dark backgrounds, ensuring data series are distinguishable and labels are legible.

#### Scenario: Bar chart dark mode
- **WHEN** dark mode is active AND a bar chart is visible
- **THEN** bars SHALL use dark-mode-appropriate fill colors and axis labels SHALL be legible

#### Scenario: Area chart dark mode
- **WHEN** dark mode is active AND an area chart is visible
- **THEN** area fills and stroke colors SHALL be visible against the dark background

#### Scenario: Pie/radial chart dark mode
- **WHEN** dark mode is active AND a pie or radial bar chart is visible
- **THEN** segment colors SHALL be distinguishable and legend labels SHALL be legible

---

### Requirement: No hardcoded light-only color utilities remain in components
All component files SHALL use shadcn/ui semantic color tokens or Tailwind `dark:` variant utilities instead of raw light-only classes (e.g. `bg-white`, `text-gray-900`).

#### Scenario: No orphaned light-only backgrounds
- **WHEN** dark mode is active
- **THEN** no component SHALL display a white or light-gray background that was not explicitly given a `dark:` variant override

#### Scenario: No orphaned light-only text
- **WHEN** dark mode is active
- **THEN** no text SHALL become invisible or near-invisible due to a missing `dark:text-*` override
