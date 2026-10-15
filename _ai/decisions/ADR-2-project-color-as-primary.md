# ADR-2: Use the project color as the admin UI primary color

**Date:** 2026-10-13
**Status:** Implemented (slyk/d9 `main` f72d80075, deployed to tps-side 2026-10-13) Upstream: discussion LaWebcapsule/d9#431, PR LaWebcapsule/d9#432 (branch `upstream/project-color`, 2026-10-15).
**Deciders:** Kyrylo Kuzmytskyi (approved 2026-10-13: Option A, no contrast guard; built directly on tps-side because the instance was still empty. Revised 2026-10-13 after testing: the proposed 20% dark mode lift was dropped, it desaturated the color; the project color is used as is in every theme)

## Context

Settings → Project Settings has a "Project Color". Today it only tints a few "brand" surfaces: the module bar logo
square, the login/shared page logo square, the favicon circle and the login page art (`--brand` and `colors.primary` in
`public-view.vue`). Buttons, links, focus rings, toggles, selected rows and most icons keep the stock purple, because they use
`var(--primary)` and its shades, which are **generated at build time by Sass from a fixed purple**:

- `app/src/styles/_colors.scss`: `$purple: #6644ff`, `$step-mapping` (10, 25, 50, 75, 90, none, 110, 125, 150, 175, 190).
- `app/src/styles/themes/_light.scss` / `_dark.scss`: `@include generate-colors(...)`. Dark mode uses a lighter purple
  (`#8866ff`) for contrast, and light mode maps `--primary-alt` to `--purple-10` (hardcoded).
- `generate-colors` emits `--primary`, `--primary-10 ... --primary-190` as `mix(<tint or shade>, <color>, 100% - |step|)`.
  Light theme: positive steps mix toward `#fff`, negative toward `#2e3c43`. Dark theme: positive toward `#16151a`,
  negative toward `#fff`.

Usage: `var(--primary)` x585, `-alt` x22, `-25` x20, `-10` x19, `-125` x12, `-50` x5, `-75` x3, `-150` x2 (171 files). Editing
them is not an option; the fix must change the variables, not the consumers.

Constraints found while investigating:

1. The app root `#directus` already receives `--brand` as an inline style, but menus and dialogs are teleported to
   `#menu-outlet` / `#dialog-outlet` in `app/index.html`, **outside** `#directus`. An override there would leave popups purple.
   The override has to be on `<body>` (inline style beats the `body.light` / `body.dark` class rules, and works for `auto`).
2. The color has to stay theme-aware (light, dark, `auto` following the OS), so the shade mixing cannot be a one-time JS
   computation unless it also tracks the theme.
3. `project_color` is public (`/server/info`), so the override also applies to the login page.
4. `--purple` (syntax highlighting, map markers) and `--secondary` (pink) are not "primary" and stay as they are.

## Requirements

- [ ] R1: With a Project Color set, every `--primary*` consumer (buttons, links, focus, toggles, icons, selections) uses it,
      in light, dark and auto themes, including menus and dialogs.
- [ ] R2: With no Project Color set, the UI is pixel-identical to today (stock purple, including the lighter dark purple).
- [ ] R3: Changing or clearing the color in Settings takes effect without a page reload (same trigger as the favicon).
- [ ] R4: Touches as few files as possible, no change to the 171 consumers; low merge-conflict surface for upstream merges.
- [ ] R5: Works on the login page (before authentication).
- [ ] R6: Implementable as a clean upstream proposal later, but fork-only for now; no upstream issue/PR yet.

## Affected Areas

### Frontend (admin app)
- `app/src/app.vue`: one watcher applies/removes the variables on `document.body` (next to the existing favicon watcher).
- `app/src/utils/project-primary-vars.ts` (new, plus a unit test): pure function `color -> { css variable: value }`.
- `app/src/styles/themes/_light.scss`, `_dark.scss`: 3 declarations each (the theme's mix colors and the dark "lift"), no change in
  the generated palette.

### Backend / Database / Docs
- None. Optionally one sentence in the Project Color field note.

## Options Considered

### Option A: CSS-only override with `color-mix()` on `<body>` (recommended)

The theme files expose the numbers Sass already uses as variables (`--primary-mix-pos`, `--primary-mix-neg`, and
`--primary-lift`: 0% light, 20% dark). A util emits, when a project color is set:

```
--primary-base: <project color>
--primary:      color-mix(in srgb, var(--primary-base), #fff var(--primary-lift))
--primary-10:   color-mix(in srgb, var(--primary) 10%, var(--primary-mix-pos))      /* same for 25, 50, 75, 90 */
--primary-125:  color-mix(in srgb, var(--primary) 75%, var(--primary-mix-neg))      /* same for 110, 150, 175, 190 */
--primary-alt:  var(--primary-10)
```

The browser resolves the theme, so light/dark/auto and OS changes need no JS. Mathematically identical to Sass `mix()` (checked:
`#6644ff` mixed 20% with white gives `#8569ff`, the stock dark purple is `#8866ff`).
- Pros: ~60 lines in total, 4 touched files, theme-aware for free, popups covered (body), live update.
- Cons: needs `color-mix()` (Chrome 111+, Safari 16.2+, Firefox 113+; all 2023). Guard with `CSS.supports(...)`: unsupported
  browsers keep the stock purple, nothing breaks.

### Option B: JS computes every shade with the `color` library

Same idea, but values are computed in TypeScript for the resolved theme (`getTheme()`).
- Pros: no `color-mix()` requirement, the numbers are visible in devtools.
- Cons: must re-run on user theme change **and** on OS `prefers-color-scheme` change (extra listeners and state), more code,
  easy to drift from the Sass mixing rules.

### Option C: Make the Sass palette configurable at build time

- Pros: zero runtime cost.
- Cons: the color is a per-instance database setting, not a build parameter; a rebuild per color change. Rejected.

### Option D: Override only `--primary` and leave the shades

- Cons: hover/alt/selected backgrounds (`-10`, `-25`, `-alt`, ...) stay lavender around a differently colored button.
  Looks broken. Rejected.

## Decision (proposed)

**Option A.** Open choices for the approver (recommended answer first):

1. **Dark theme lift (rejected after testing, see Status):** lighten the project color 20% toward white in dark mode (reproduces the stock `#6644ff` -> `#8866ff`
   relationship, keeps contrast on dark backgrounds) **vs.** use the exact color in both themes.
2. **Contrast guard:** none, the admin is responsible for choosing a color readable with white button text **vs.** auto-pick
   dark/light button text. Recommended: none (out of scope; the Settings field is already free-form).
3. **Rollout:** build and test on `tps-side-dev`, PR to `slyk/d9`, deploy to `tps-side`. Upstream later via a GitHub
   Discussion (features are not accepted as issues), based on `upstream/main`; no upstream contact until approved.

## Consequences

- The project color becomes a real brand color for the whole admin UI; "Project Color" in Settings now means more than
  before. Existing instances with an odd color (e.g. light yellow) will see it everywhere after upgrading, so mention it in the
  changelog if sent upstream (opt-in is not possible without a new setting).
- Palette generation now exists twice (Sass for the defaults, CSS `color-mix` for the override). A unit test pins the util to
  the Sass values for the default purple so they cannot drift.
- Browsers without `color-mix()` silently keep the stock purple.

## Open Issues & Blockers

- None blocking. Needs the three choices above.
