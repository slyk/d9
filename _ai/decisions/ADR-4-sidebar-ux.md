# ADR-4: Sidebar and header ergonomics (resizable sidebar, grips, header actions)

**Date:** 2026-10-15
**Status:** Implemented on branch `feat/sidebar-ux` (4 commits on `upstream/main`), on tps-side-dev for review; not merged to the fork yet
**Deciders:** Kyrylo Kuzmytskyi (requested 2026-10-15; approved the same day with these refinements: sidebar minimum 200px and
collapse when dragged near the window edge, auto-collapse as a flag of the shared resize logic, no expand animation when a page
opens with the sidebar already open, a thin separator above the clickable empty area)

## Context

Naming used below (LTR layout, `app/src/views/private/private-view.vue`):

- **nav**: the left panel, `#navigation` → `.module-nav` (220px by default). It is already resizable: a 4px
  `.module-nav-resize-handle` that only appears on hover, drag to resize (min 220, max = window - 590 content - 60 module bar -
  sidebar), double-click to reset, width kept in local storage (`directus-module-nav-width`). The logic is a local
  `useModuleNavResize()` inside `private-view.vue`.
- **sidebar**: the right panel, `#sidebar`, holding the accordion sections (`sidebar-detail.vue`: Information, Revisions,
  Comments, …). Fixed at 280px when open, a 60px icon rail when closed (≥960px), an overlay below 1260px. Open state is
  `appStore.sidebarOpen`, persisted in local storage. Clicking anywhere on the closed rail opens it.
- **header actions**: `header-bar-actions.vue`, the round buttons at the right of `header-bar.vue`.

Problems:

1. The sidebar cannot be resized; 280px is narrow for long relational values or comments.
2. When the sidebar is already open and the user goes to another page, every section is collapsed. Cause:
   `sidebar-detail-group.vue` opens the first section only in a `watch` on `sidebarOpen` *changes*; each page mounts a new
   `private-view` with `sidebarOpen` already `true`, so the watcher never runs.
3. The open sidebar cannot be closed by clicking its empty part, unlike the closed rail which opens on any click.
4. Resize handles are invisible until hovered, so users do not know panels can be resized.
5. Header actions collapse into an expand button whenever the **window** is under 960px (CSS media queries), even when the
   header has room for all of them (e.g. 940px window: the nav is an overlay there, so the header is almost full width).

Directus 10+ code is not used (fork rule); everything here is written for d9.

## Requirements

- [ ] R1: The sidebar is resizable from its left edge while open: min 200px (the panel stops shrinking there), max leaves 590px
      for the content, double-click resets to 280px, width persisted per browser like the nav width.
- [ ] R2: While dragging the sidebar past its minimum, if the pointer comes within 48px of the window edge the sidebar closes
      (to the rail). Its width before the drag is kept for the next open.
- [ ] R3: One shared resize composable drives both panels; auto-collapse is an option (on for the sidebar, off for the nav until
      the nav becomes collapsible in a separate feature).
- [ ] R4: Opening a page while the sidebar is open shows the first section already open, without the expand animation. Opening
      the sidebar by hand keeps the animation.
- [ ] R5: A click on the empty area below the sections closes the sidebar; clicks inside sections never do. A 1px separator
      marks where that area starts.
- [ ] R6: Both panels show a small grip (rounded bar with dots, centred vertically) on the resizable edge even without hover,
      in theme colours (light and dark); it turns `--primary` on hover/drag together with the existing handle line.
- [ ] R7: Header actions collapse only when they do not fit: the buttons may use up to half of the header width; the rest is
      reserved for the title. No flicker at the boundary, no layout flash on load.
- [ ] R8: No API, migration or setting changes; nav behaviour stays the same apart from the grip.

## Decision

### Shared resize composable (R1–R3)
`app/src/composables/use-panel-resize.ts`, extracted from `useModuleNavResize()`:

- Options: `edge` (`'right'` for the nav, which grows to the right; `'left'` for the sidebar), `defaultWidth`, `minWidth`,
  `maxWidth` (ref, recomputed from window/nav/sidebar sizes like today), `storageKey`, `snap` (px around the default that snap
  to it; the nav keeps its 220–230 → 220 snap), optional `collapse: { threshold, onCollapse }`.
- Returns `width` (bound as a style / CSS variable instead of writing `style.width` by hand), `dragging`, and the pointer
  handlers. The stored value is removed when the width equals the default (current nav behaviour).
- Collapse: only when the computed width is already at the minimum and the pointer is within `threshold` px of the window edge
  on the panel's side; the drag ends, the width returns to the width at drag start, `onCollapse()` runs.
- While dragging, `.private-view` gets a `resizing` class: no width/flex-basis transitions, `user-select: none`, `ew-resize`
  cursor everywhere (the sidebar's `flex-basis` transition would otherwise lag behind the pointer).

Sidebar width is applied through `--sidebar-width` on `#sidebar` (`width`, inner `.flex-container` width, and `flex-basis`
when open at ≥1260px). Only `private-view.vue` hard-codes 280px (checked: notifications and layouts do not depend on it).

### Grip and handle component (R6)
`app/src/views/private/components/panel-resize-handle.vue`: the full-height hover line (current look) plus a ~6×28px rounded
grip with a dot pattern, colours from `--background-normal-alt` / `--border-normal` / `--foreground-subdued`, `--primary` on
hover and while dragging. The nav keeps the `module-nav-resize-handle` class (custom CSS in the wild may target it). The sidebar
handle sits inside its left edge (the sidebar has `overflow: hidden`) and only exists while the sidebar is open.

### First section open without animation (R4)
`sidebar-detail-group.vue` runs its "open the first section" step also when it mounts with the sidebar open, and provides an
`animate` flag that is `false` until that first open has rendered. `sidebar-detail.vue` passes it to `transition-expand`, which
gets a `disabled` prop (no CSS classes, no JS hooks). `useGroupable` is not changed: with a `v-model` selection the parent only
sees the new value after a re-render, so the first item cannot start active synchronously.

### Click empty area to close (R5)
The existing `.spacer` under the sections in `private-view.vue` gets `@click.stop` → `sidebarOpen = false` (stop, because the
`#sidebar` click handler opens it), `cursor: pointer`, and a 1px `--border-normal` top border while the sidebar is open.

### Header actions by available width (R7)
`header-bar-actions.vue` replaces the `@media (min-width: 960px)` rules with a `collapsed` state:

- Measured in `onMounted` (before the first paint) and on a `ResizeObserver` of the header and a `MutationObserver` of the
  button list (batch actions add buttons): a `measuring` class shows every button for one synchronous layout read, then is
  removed (no visible flash).
- Collapse when the natural width of the buttons plus the other elements right of the spacer (layout item count) > 50% of
  the header content width. Not re-measured on button size changes (the search input grows when focused and must not trigger
  a collapse).
- The info button that opens the sidebar keeps its rule: only below 960px, where there is no sidebar rail.

## Delivery

One branch `feat/sidebar-ux` from `upstream/main`, one signed-off commit per item plus changesets; tested together on
tps-side-dev, merged to the fork through one fork PR, deployed with `opend-build` / `opend-use`. Upstream gets four PRs
(cherry-picked onto separate branches):

| Upstream PR | Items |
|---|---|
| A. `fix(app)`: keep the first sidebar section open across pages | R4 |
| B. `feat(app)`: resizable sidebar with visible grip handles | R1–R3, R6 |
| C. `feat(app)`: header actions collapse only when they do not fit | R7 |
| D. `feat(app)`: click empty sidebar space to close it | R5 |

## Consequences

- Wider sidebars take space from the content; the max keeps 590px for it as the nav does.
- A collapsible nav (icon rail like the sidebar) is a separate feature and PR; the composable already supports it.
- Header layout now depends on measured widths; extensions that put very wide elements into the actions slot collapse sooner.

## Open Issues

- Grip dot pattern (2 or 3 dots) to be tuned on dev.

## Implementation notes (2026-10-15)

- Commits on `feat/sidebar-ux`: `fix(app): keep the first sidebar section open across pages`, `feat(app): resizable sidebar
  with visible grip handles`, `feat(app): collapse header actions only when they do not fit`, `feat(app): close the sidebar by
  clicking its empty area`; one changeset each.
- No hysteresis for the header actions: the measured width does not depend on the collapsed state and the header width does
  not depend on the actions, so there is no feedback loop to damp.
- Drag: one pending `requestAnimationFrame` at a time, and the pending move is applied on `pointerup`. The first version
  cancelled the frame on every move and on release, which lost the whole drag when frames are slow (seen in a throttled Chrome
  tab: ~220ms per frame). Widths are rounded to whole pixels.
- The click after a drag is swallowed in the capture phase (`once`, removed again after a 0ms timeout); otherwise releasing the
  pointer over the closed rail after a collapse re-opened the sidebar.
- Verified in Chrome on dev (1440px, dark theme): resize 200–570px (1440 - 590 - 60 - 220), collapse near the edge keeps the
  previous width, double-click reset, first section open without animation on Users / Files, click in a section keeps the
  sidebar open and click on the empty area closes it, header actions all visible at 920px and collapse/expand when buttons are
  added at 500px. Light theme and the grip look still to be checked by the requester.
- Dev note: `upstream/main` after v12.0.19 adds `request-filtering-agent` (GHSA-xhgj-x4mj-6c93 fix), so `pnpm install` was
  needed on dev; the app build gets OOM-killed while the dev API runs.
