// Centralized configuration for the Timeline app
// Only important, externally tunable values have been lifted here.

const CONFIG = {
  app: {
    initialVersion: 1,
    defaultTimelineName: 'Default',
    newTimelineName: 'New Timeline',
    idLength: 8,
  },
  // Visual types legend for event categories
  types: {
    history: {
      key: 'rose',
      dot: 'bg-rose-600',
      border: 'rose',
      bgTint: 'bg-rose-500/10 dark:bg-rose-400/15',
      badge: 'bg-rose-500/15 dark:bg-rose-400/20 border-rose-500/30',
    },
    personal: {
      key: 'emerald',
      dot: 'bg-emerald-600',
      border: 'emerald',
      bgTint: 'bg-emerald-500/10 dark:bg-emerald-400/15',
      badge: 'bg-emerald-500/15 dark:bg-emerald-400/20 border-emerald-500/30',
    },
    science: {
      key: 'blue',
      dot: 'bg-blue-600',
      border: 'blue',
      bgTint: 'bg-blue-500/10 dark:bg-blue-400/15',
      badge: 'bg-blue-500/15 dark:bg-blue-400/20 border-blue-500/30',
    },
    culture: {
      key: 'violet',
      dot: 'bg-violet-600',
      border: 'violet',
      bgTint: 'bg-violet-500/10 dark:bg-violet-400/15',
      badge: 'bg-violet-500/15 dark:bg-violet-400/20 border-violet-500/30',
    },
    tech: {
      key: 'amber',
      dot: 'bg-amber-500',
      border: 'amber',
      bgTint: 'bg-amber-500/15 dark:bg-amber-400/20',
      badge: 'bg-amber-500/20 dark:bg-amber-400/25 border-amber-500/30',
    },
    other: {
      key: 'slate',
      dot: 'bg-slate-600',
      border: 'slate',
      bgTint: 'bg-neutral-500/10 dark:bg-neutral-400/15',
      badge: 'bg-neutral-500/15 dark:bg-neutral-400/20 border-neutral-500/30',
    },
  },
  storage: {
    appKey: 'timeline_app',
    debounceMs: 300,
  },
  zoom: {
    // Base bounds; actual runtime bounds become adaptive to domain span
    scaleMin: 0.5,
    scaleMax: 5,
    step: 0.1,
    reset: 1,
    wheelDeltaClampPer1000: 0.25, // clamp of delta/1000 on wheel
    snapLevels: [0.5, 1, 2, 4, 5],
    snapThreshold: 0.06,
    adaptive: {
      // Minimum visible span in years at max zoom-in (controls how far you can zoom in)
      // Example: 1 / (365 * 24) ~= one hour, 1 / (365 * 24 * 60) ~= one minute
      minVisibleSpanYears: 1 / (365 * 24), // one hour
      // Hard caps to keep math stable regardless of range
      maxScaleCap: 1000000,
      minScaleFloor: 0.25,
    },
  },
  axis: {
    defaultDomain: [1990, 2030],
    visiblePadRatio: 0.05, // 5% label pad
    domainPadRatio: 0.1, // 10% padding around min/max from events
    // Tick density controls
    // Single base to harmonize subdivisions across units (e.g., 4 -> quarters, 4 weeks, 6 hours, 15 minutes)
    canonicalBase: 4,
    // When to switch tick units based on visible span (configurable)
    thresholds: {
      minuteUpperHours: 6,      // <= 6 hours -> minutes
      hourUpperDays: 7,         // <= 7 days -> hours
      dayUpperYears: 0.08,      // <= ~1 month -> days
      weekUpperYears: 0.5,      // <= ~6 months -> weeks
      monthUpperYears: 12,      // <= 12 years -> months
    },
    maxLabels: 14,
    // Desired pixel spacing between adjacent fine tick labels across units
    targetTickPx: 60,
    minLabelSpacingPx: 42,
    // Axis presentation
    trackHeightPx: 64,        // matches tailwind h-16
    markerFontPx: 11,
    labelFontPx: 10,
    labelMaxWidthPx: 140,
    // Mild deadband to reduce step/unit flipping near thresholds (0 = off)
    hysteresisPct: 0.05, // default hysteresis
    // Step candidates per unit (standard ticking)
    stepSets: {
      year: [1, 2, 5, 10, 20, 25, 50, 100],
      month: [1, 3, 6],
      week: [1],
      day: [1, 2, 5, 10],
      hour: [1, 2, 3, 6, 12],
      minute: [1, 5, 10, 15, 30],
    },
    // Edge pinning threshold for top markers
    pinThresholdPx: 6,
    maxDayTicks: 1200,
    maxHourTicks: 1500,
    maxMinuteTicks: 3000,
    // Canonical tick configuration
    canonicalTicks: true,
    contextLabels: true,
    minuteStep: 15,
    weekStart: 'monday', // 'monday' or 'sunday'
    // Feature flag for the new two-track axis planner (markers + spans)
    plannerEnabled: false,
    // Sticky edge markers: if the first/last in-view marker is within this percent from the edge, skip pinning
    edgePinMinGapPct: 2,
    // Ensure at least this many edge pins (0..2). Recommended: 2 (both edges)
    edgePinsMinCount: 2,
    // Hysteresis to avoid unit flicker when zoom changes slightly
    plannerHysteresisScalePct: 0.08, // if |Δscale|/prevScale < 8% and unit changes, keep previous unit
  },
  format: {
    locale: undefined, // e.g., 'en-US' | 'fr-FR'; undefined = browser default
    timeZone: 'UTC',   // Keep UTC-based timeline semantics by default
  },
  events: {
    defaults: {
      startYear: 2000,
      end: { month: 1, day: 1, hour: 0, minute: 0 },
    },
    yearRange: { min: 1900, max: 2100 },
    textLimits: { titleMax: 100, bodyMax: 500 },
  },
  display: {
    levelGap: 30,
    extraOffsetPx: 10,
    laneMarginPx: 24,
  },
  toast: {
    durationMsDefault: 2500,
  },
};

export default CONFIG;
