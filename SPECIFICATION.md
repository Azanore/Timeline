# Timeline App Specification

Version: 1.0
Last Updated: 2025-08-20

## 1. Overview
- Responsive, performant React timeline application.
- Chronological axis: oldest (left) → newest (right).
- Desktop: horizontal layout. Mobile (<768px): vertical layout.
- Draggable and zoomable timeline with decade-based intelligent breakpoints.
- Multiple named timelines persisted in localStorage.
- TailwindCSS-only styling; no other external libraries.

## 2. Quality & Coding Standards (85% Benchmark)
- Single Responsibility Principle: one concern per component/function.
- DRY: extract shared logic into custom hooks/utilities.
- Naming:
  - Variables/functions: camelCase
  - Components: PascalCase
  - Custom CSS classes (when unavoidable): kebab-case (prefer Tailwind utilities)
- Component size: ≤150 lines per file; split if exceeded.
- Props: TypeScript-style JSDoc typedefs above components.
- Error Boundaries: wrap complex trees (timeline rendering/providers).
- Performance:
  - React.memo for expensive nodes (e.g., EventCard).
  - useMemo for heavy calculations (positions, stacks, scaling).
  - Debounce interactive operations (zoom/pan/persist) by 300ms.
- File organization: ≤5 components per folder, grouped logically.
- No external libs beyond TailwindCSS.

## 3. Project Structure (folders only)
```
/src
  /assets
    /icons
    /images
  /components
    /events
    /layout
    /timeline
    /ui
  /context
  /hooks
  /providers
  /types
  /utils
  /views
```
- components/events: EventCard, EventDialog, EventForm
- components/layout: Header, FloatingButton
- components/timeline: Timeline, TimelineAxis, ZoomControls
- components/ui: Modal, Button, Input
- context: TimelineContext and provider
- hooks: useTimeline, useEvents, useLocalStorage, useZoomPan, useVirtualScroll, useValidation
- providers: ErrorBoundary, AppProviders
- types: shared typedefs (JSDoc)
- utils: sorting, validation, scaling, sanitizer, storage helpers
- views: TimelineView and other top-level screens

## 4. State Management
- React Context (no Redux).
- TimelineContext manages:
  - Active timeline id, list of timelines
  - Events for active timeline
  - Viewport: { scale, pan }
  - CRUD APIs for timelines and events
- Custom Hooks:
  - useTimeline(): active timeline management, domain calculations, orientation.
  - useEvents(): CRUD + sorting, collision resolution, stack computation, selectors.
  - useLocalStorage<T>(): typed get/set with versioning, migration, quota handling.
  - useZoomPan(): scale (0.1–5), pan bounds, wheel/drag/pinch handling, debounced updates.
  - useVirtualScroll(): windowing/virtualization when >100 events.
  - useValidation(): event input validation & error map.
- Local component state is for UI-only (dialogs, inputs, hover).

## 5. Data Model
- Event
  - id: string (uuid)
  - title: string (required, max 100)
  - body?: string (max 500)
  - type: one of ['history','personal','science','culture','tech','other']
  - start: { year: number (1900–2100), month?: 1–12, day?: 1–31 valid combo, hour?: 0–23, minute?: 0–59 }
  - end?: same structure as start (if present → render as period)
- Timeline
  - id: string
  - name: string
  - createdAt: number (ms)
  - updatedAt: number (ms)
  - events: Event[]
  - version: number (schema version)
- LocalStorage keys
  - timeline_${timelineId} → Timeline payload
  - timeline_index → [{ id, name, version }]
  - timeline_backup_${timelineId} → last good state backup (for recovery)

## 6. Event System
### 6.1 Add Event Flow
- Floating "Add Event" button fixed bottom-right.
- Modal fields:
  - Title (required, ≤100)
  - Body (optional, ≤500)
  - Type (dropdown with 6 categories)
  - Date/Time (start): year required; month/day/hour/minute optional
  - Optional end (period event)
- Sorting algorithm (auto):
  - Sort by year → month → day → hour → minute
  - Undefined treated as 0
  - Stable sort for identical timestamps

### 6.2 Placement & Collision Resolution
- Alternating placement above/below axis.
- For identical timestamps, stack alternately:
  - 1: above, 2: below, 3: above+1 level, 4: below+1 level, etc.
- Max stack height: 4 levels per side (8 total levels).
- Overflow: if >4 events per side at a timestamp, render a scrollable mini-timeline inside that cluster.
- Vertical spacing between stack levels: 60px.

### 6.3 Display Rules
- Truncation: title max 2 lines; body max 3 lines with ellipsis.
- Click → readonly dialog with full content; toggle to edit mode with confirm/cancel.
- Period events: horizontal bar spanning start→end dates with label.

## 7. Timeline Scaling & Axis
- Linear scaling across time domain (minYear–maxYear) with pan/zoom.
- Intelligent breakpoints:
  - Default decade markers; increase density with zoom to years, then months if necessary.
- Centered axis; fills 100vh; horizontally/vertically centered depending on orientation.
- Mobile switches to vertical orientation with same rules.

## 8. Zoom/Pan Implementation
- Zoom: 0.1x–5x via mouse wheel (desktop) and pinch (mobile).
- Pan: drag to move; clamp within content bounds.
- Debounce: 300ms for zoom/pan state updates.
- Visual feedback: marker density adapts; smooth transitions using `transition-all duration-300`.

## 9. Persistence, Migration, and Errors
- Save on every CRUD (debounced 300ms). Update `updatedAt`.
- Quota exceeded:
  - Catch and surface friendly error; suggest clearing storage/reducing data.
- Invalid data:
  - Validate on load; migrate if possible; else revert to last backup and notify.
- Migration strategy:
  - Include `version` in timeline; `migrateTimeline(vX→vY)` handles transitions.
  - Keep `timeline_backup_${id}` as last known good prior to migration.

## 10. Validation & Sanitization
- Year range: 1900–2100 inclusive.
- Month/day/hour/minute: enforce valid calendar combinations (leap years).
- Text: trim and escape HTML to prevent XSS.
- Field-level error messages; disable confirm until valid.

## 11. Styling & Theming (TailwindCSS-only)
- Use Tailwind utilities; no custom CSS files.
- Color palette (event types):
  - history: indigo-500
  - personal: emerald-500
  - science: sky-500
  - culture: rose-500
  - tech: amber-500
  - other: slate-500
- Animations: `transition-all duration-300` on interactions.

## 12. Performance Requirements
- Virtualization when events >100 (useVirtualScroll windowing).
- Memoize calculations for positions/stacks.
- React.memo on EventCard and heavy components.
- Debounced zoom/pan and persistence (300ms).

## 13. Accessibility (A11y)
- Keyboard-accessible modals and controls.
- Focus trap within modals.
- ARIA labels for actionable elements.
- Maintain color contrast.

## 14. Responsiveness
- Mobile-first design.
- Breakpoint: 768px switches to vertical timeline.
- Touch gestures for pinch/drag; appropriate hit targets.

## 15. Error Handling Strategy
- ErrorBoundary wraps Timeline tree and Providers.
- Localized error UI for:
  - Storage quota/parse errors
  - Migration failures
  - Validation errors (inline)
- Dev logging: console (throttled). Prod: noop.

## 16. Component Responsibilities (Matrix Summary)
- Timeline: container orchestrating axis + events + zoom/pan; orientation switch.
- TimelineAxis: markers/gridlines density based on scale and domain.
- ZoomControls: UI to adjust/reset zoom with accessible controls.
- EventCard: visual node for point/period events; truncation; color by type; stack position.
- EventDialog: readonly view; toggle to edit; delete; confirm/cancel.
- EventForm: controlled inputs; validation/sanitization; emits EventInput.
- Header: title, timeline switcher, create timeline.
- FloatingButton: fixed CTA to open add-event dialog.
- Modal/Button/Input: reusable UI with variants and error states.

## 17. Hooks & Utils (API Contracts)
- useTimeline(): { activeTimelineId, setActiveTimeline, timelines, createTimeline(name), deleteTimeline(id), domain, orientation }
- useEvents(): { events, addEvent(e), updateEvent(id,e), removeEvent(id), sortedEvents, clusters, stacks }
- useLocalStorage<T>(): { get(key), set(key, val), remove(key), migrate }
- useZoomPan(): { scale, setScale, pan, setPan, onWheel, onDrag, onPinch }
- useVirtualScroll(): { startIndex, endIndex, totalHeight/Width, itemPositions }
- Utilities: sortEventsByTimestamp, comparePartialDate, buildLinearScaler, computeEventPositions, computeStacksAtTimestamp, sanitizeText, isValidDateParts, clampYear, clampPan, debounce, safeParse, safeStringify

## 18. Forbidden Items
- Do not implement full components in this spec file.
- Do not add libraries beyond TailwindCSS.
- Do not introduce complex state management beyond Context + hooks.

## 19. Deliverable Checklist
- ✅ Folder structure diagram
- ✅ Complete markdown specification file (this file)
- ✅ Component responsibility matrix (summary in §16)
- ✅ Implementation phases (see below)
- ✅ Error handling strategy (§15)
- ✅ Mobile responsiveness plan (§14)

## 20. Implementation Phases (Roadmap)
- Phase 1: Foundations
  - Context, providers, types, palette, base UI (Modal, Button, Input), useLocalStorage + migrations.
  - Exit: TimelineContext provides empty timeline; app shell renders.
- Phase 2: Timeline Axis & Layout
  - Linear scaler, decade markers, density adjustments; Timeline/Axis/ZoomControls with useZoomPan.
  - Exit: Axis renders with zoom/pan; responsive orientation.
- Phase 3: Events Core
  - Sorting, collision resolution, stacks, period bars; EventCard/Dialog/Form with validation & sanitization.
  - Exit: Add/view/edit events; persistence; correct placement & stacking.
- Phase 4: Performance & Virtualization
  - useVirtualScroll, memoization, React.memo for heavy nodes; debounced interactions.
  - Exit: Smooth with >100 events.
- Phase 5: Multi-Timeline & Polish
  - Create/switch timelines; backups/recovery; a11y; ErrorBoundaries; tests for utils.
  - Exit: All checklist items met; refined UX; clean console.
