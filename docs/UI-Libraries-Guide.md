# UI Libraries Guide (Radix, Motion, CVA, Lucide, date-fns)

This doc defines how to use the newly added libraries with Tailwind v4 in this project, and when NOT to use them. Follow this to avoid layout regressions in the timeline/axis rendering.

## Principles
- Strong separation: Timeline/Axis sizing must not be affected by overlays or animations.
- Transform-only animations on measured nodes (opacity/translate/scale). Never animate width/height/margins of timeline containers.
- Portals for overlays (modals/popovers/tooltips) so they live outside the measured timeline subtree.
- No global CSS resets beyond Tailwind defaults.

## Design Direction: Modern Minimal (85% purity)
- We adopt a "pure Modern Minimal" style target with at least ~85% adherence.
- Data-first visuals: neutral surfaces; event types provide color accents from `CONFIG.types`.
- Clean borders and subtle elevation only where necessary (overlays). Strong focus states.
- Motion is tasteful and purely transform/opacity-based; respects `prefers-reduced-motion`.

## Light/Dark Mode Setup Checklist
- Tailwind `dark` class is enabled (see `tailwind.config.js`).
- Define HSL CSS variables in `src/index.css` for both modes (background, foreground, border, ring, primary, secondary, accent, muted, card, popover).
- Map UI primitives (Button/Input) and gridlines/labels in `TimelineAxis.jsx` to these tokens.
- Ensure contrast ratios meet accessibility in both modes, especially for axis gridlines and labels.
- Verify no dimension shifts when toggling modes (tokens should not change spacing/radius).

## Libraries
- Radix UI: `@radix-ui/react-dialog`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`
- Motion: `framer-motion`
- Variants: `class-variance-authority` (CVA)
- Icons: `lucide-react`
- Dates: `date-fns`

## Radix UI (Dialog/Tooltip/Popover)
Use for any overlay, focus management, or a11y-critical component.

- Where to use:
  - Replace `src/components/ui/Modal.jsx` with Radix Dialog.
  - Future popovers (e.g., event quick actions) -> Radix Popover.
  - Hover explanations -> Radix Tooltip.
- How:
  - Always style with Tailwind classes on Radix parts (Trigger, Content, Overlay).
  - Keep overlays in portals (default). Do NOT render them inside timeline containers.
  - Respect `aria-*` props and label titles.
- Do NOT:
  - Do not wrap `Timeline.jsx`/`TimelineAxis.jsx` inside a Dialog/Popover.
  - Do not manually trap focus; let Radix handle it.
  - Do not change body box model; accept Radix scroll lock defaults.

## Framer Motion
Use for micro-interactions and subtle feedback.

- Where to use:
  - Buttons, dialogs, cards, hover states.
  - Event chip hover/press. Zoom control affordances.
- How:
  - Use transform/opacity animations (`initial/animate/exit`, `whileHover`, `whileTap`).
  - Avoid `layout` on timeline/axis containers. If needed, use it only on non-measured UI.
- Do NOT:
  - Do not animate `width/height/margin/padding` of elements that inform axis math.
  - Do not animate the main timeline wrapper or axis container dimensions.

## CVA (class-variance-authority)
Use to standardize variants for primitive UI components.

- Where to use:
  - `src/components/ui/Button.jsx`, `Input.jsx`, and future primitives (Badge, Card).
- How:
  - Define `variant` and `size` with CVA. Keep outputs as Tailwind class strings.
  - Map color semantics to project tokens (HSL vars in `tailwind.config.js`).
- Do NOT:
  - Do not use CVA for complex timeline geometry; only for UI primitives.

## Lucide React
Use for icons in Header, Buttons, ZoomControls, Event actions.

- How:
  - Import icons individually for tree-shaking.
  - Size with `h-4 w-4` etc. Color via `text-*` Tailwind classes.
- Do NOT:
  - Do not inline large SVGs inside measured nodes if they could alter sizing unexpectedly. Set explicit `size`.

## date-fns
Use for formatting/parsing dates in labels and event metadata.

- How:
  - Prefer per-function imports: `import { format } from "date-fns"`.
  - Keep pure formatting in utils; avoid coupling to React components.
- Do NOT:
  - Do not attach date mutation to component render loops; memoize if heavy.

## Timeline & Axis Safety Checklist
- Measurements are taken from a dedicated wrapper ref (not document body).
- Overlays render in portals (outside measured subtree).
- No layout-affecting animations on measured nodes.
- Test zoom/pan with overlays open; verify no dimension change.
- Respect `prefers-reduced-motion` for accessibility.

## Component Boundaries
- Timeline/Axis components: pure layout + render logic only (no dialogs inside).
- UI primitives (Button/Input/Modal): can use CVA, Radix, Motion freely.
- Views/Layout: orchestrate overlays/popovers, never the low-level Timeline container.

## Examples (Pseudo)
- Radix Dialog skeleton:

```tsx
<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>Open</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40" />
    <Dialog.Content className="fixed inset-0 m-auto max-w-md rounded-lg bg-background p-4">
      ...
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

- Motion on non-measured UI:
```tsx
<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} />
```

## When NOT to use these libs
- Do not use Dialog/Popover for timeline tooltips that must be part of the canvas measurement. For those, use plain absolutely-positioned elements inside the canvas layer with transforms.
- Do not use Motion layout animations on timeline/axis containers or lanes.
- Do not add CSS frameworks that bring global resets (e.g., full UI kits) alongside Tailwind.

## Migration Order
1) Swap Modal -> Radix Dialog.
2) Introduce CVA to Button/Input.
3) Add Lucide icons.
4) Add Motion micro-interactions.
5) Apply date-fns to formatting in utils.

## Performance Notes
- Keep overlays lazy-mounted when possible.
- Debounce heavy resize/scroll callbacks.
- Prefer CSS transforms over JS-driven layout changes.
