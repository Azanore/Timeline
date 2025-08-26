# Timeline/Axis Improvements Backlog

Status legend: [Done], [Planned]

## High impact

- [Planned] Virtualize off‑screen event cards
  - Render only cards intersecting the viewport (+buffer). Huge perf gain with many events.
  - Files: `src/components/timeline/Timeline.jsx`

- [Done] Viewport‑width–aware label density (min pixel spacing)
  - Implemented: capacity = floor(axisWidth / minLabelSpacingPx) with secondary pixel-spacing guard.
  - Files: `src/components/timeline/TimelineAxis.jsx`, `src/config/index.js`

- [Planned] Enable axis planner + hysteresis
  - Turn on planner for coherent spans+markers and reduced unit flicker near zoom thresholds.
  - Files: `src/config/index.js`, `src/components/timeline/TimelineAxis.jsx`, `src/utils/axisPlanner.js`

## Medium impact

- [Planned] Smooth, anchored zoom/pan easing
  - Short rAF easing (120–180ms) for wheel/keyboard with cursor anchoring. Smoother interaction.
  - Files: `src/components/timeline/Timeline.jsx`, `src/components/timeline/ZoomControls.jsx`

- [Done] Stable label selection for months/days (pan‑invariant)
  - Implemented: epoch-based modulo decimation for months/days similar to hours/minutes.
  - File: `src/components/timeline/TimelineAxis.jsx`

- [Planned] Axis label spacing and pinning polish
  - Use measured text width + min spacing when deciding which labels render; avoid near‑edge duplicates.
  - File: `src/components/timeline/TimelineAxis.jsx`

## Low–medium impact

- [Planned] Responsive track height and subtle center guideline (optional)
  - Make `h-64` responsive to viewport height; add a faint center guide.
  - File: `src/components/timeline/Timeline.jsx`

- [Planned] Configurable fixed‑phase grids per unit (optional)
  - Allow forcing specific phases (e.g., 00/06/12/18) via config.
  - Files: `src/config/index.js`, `src/components/timeline/TimelineAxis.jsx`

- [Planned] Accessibility and keyboard polish
  - Improve aria‑live, add Home/End/PageUp/PageDown behaviors.
  - Files: `src/components/timeline/Timeline.jsx`, `src/components/timeline/ZoomControls.jsx`

## Completed

- [Done] Stable global grid for non‑1 hour/minute ticks
  - Anchored to UTC epoch so phase doesn’t change when panning.
  - File: `src/components/timeline/TimelineAxis.jsx`

- [Done] Remove month/day context from hour/minute fine ticks
  - Top markers already supply day context; fine labels show only time.
  - File: `src/components/timeline/TimelineAxis.jsx`

- [Done] ResizeObserver width tracking for event layout
  - Recompute rows on container resize.
  - File: `src/components/timeline/Timeline.jsx`

- [Done] Target pixel spacing–based unit/step selection
  - Selects unit/step to hit ~`axis.targetTickPx` across periods using canonical step sets.
  - Files: `src/components/timeline/TimelineAxis.jsx`, `src/config/index.js`

- [Done] Epoch anchoring for multi‑day steps
  - Day ticks with step > 1 are snapped to a UTC epoch grid, pan‑invariant.
  - File: `src/components/timeline/TimelineAxis.jsx`

- [Done] Week labels: epoch‑based modulo decimation
  - Pan‑invariant label selection for weeks aligned to configured week start.
  - File: `src/components/timeline/TimelineAxis.jsx`

- [Done] Year step set standardized
  - Years now use steps: 1, 2, 5, 10, 20, 25, 50, 100 (standard ticking).
  - File: `src/components/timeline/TimelineAxis.jsx`
