## ADDED Requirements

### Requirement: Toggle button visible in navbar
The application SHALL display a theme toggle button (sun/moon icon) in the top navigation bar, visible on all routes at all times.

#### Scenario: Button visible on every route
- **WHEN** user navigates to any of the 5 routes (/, /pipeline, /marketing, /forecast, /deals)
- **THEN** the theme toggle button SHALL be present in the navbar

#### Scenario: Icon reflects current theme
- **WHEN** the current theme is light
- **THEN** the toggle button SHALL display a Moon icon (indicating click will switch to dark)
- **WHEN** the current theme is dark
- **THEN** the toggle button SHALL display a Sun icon (indicating click will switch to light)

---

### Requirement: Toggle switches theme on click
The application SHALL switch the active theme between light and dark when the user clicks the toggle button.

#### Scenario: Switch light to dark
- **WHEN** the current theme is light AND the user clicks the toggle button
- **THEN** the application SHALL immediately apply the dark theme across all visible UI

#### Scenario: Switch dark to light
- **WHEN** the current theme is dark AND the user clicks the toggle button
- **THEN** the application SHALL immediately apply the light theme across all visible UI

---

### Requirement: Theme preference persisted across sessions
The application SHALL persist the user's chosen theme in `localStorage` so it survives page reloads and new browser sessions.

#### Scenario: Preference survives reload
- **WHEN** the user has selected dark mode AND reloads the page
- **THEN** the application SHALL load in dark mode without requiring the user to toggle again

#### Scenario: Preference survives navigation
- **WHEN** the user has selected dark mode AND navigates between routes
- **THEN** the theme SHALL remain dark on the new route

#### Scenario: No flash of wrong theme on load
- **WHEN** the user has a saved dark mode preference AND the page loads
- **THEN** the dark theme SHALL be applied before the first paint (no visible light flash)
