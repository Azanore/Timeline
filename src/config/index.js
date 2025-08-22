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
    history: { key: 'rose', dot: 'bg-rose-600', border: 'rose' },
    personal: { key: 'emerald', dot: 'bg-emerald-600', border: 'emerald' },
    science: { key: 'blue', dot: 'bg-blue-600', border: 'blue' },
    culture: { key: 'violet', dot: 'bg-violet-600', border: 'violet' },
    tech: { key: 'amber', dot: 'bg-amber-500', border: 'amber' },
    other: { key: 'slate', dot: 'bg-slate-600', border: 'slate' },
  },
  storage: {
    appKey: 'timeline_app',
    debounceMs: 300,
  },
  zoom: {
    scaleMin: 0.1,
    scaleMax: 5,
    step: 0.1,
    reset: 1,
    wheelDeltaClampPer1000: 0.25, // clamp of delta/1000 on wheel
    snapLevels: [0.5, 1, 2, 4, 5],
    snapThreshold: 0.06,
  },
  axis: {
    defaultDomain: [1990, 2030],
    visiblePadRatio: 0.05, // 5% label pad
    domainPadRatio: 0.1, // 10% padding around min/max from events
    maxDayTicks: 1200,
    maxHourTicks: 1500,
  },
  timeline: {
    virtualBuffer: 0.1, // 10% outside viewport
  },
  clustering: {
    lowZoomThreshold: 1.2,
    clusterMinItems: 50,
    bucketSize: 0.02,
    edgePad: 0.02,
  },
  events: {
    samePosEpsilonPct: 0.4, // percent difference for same-bucket stacking
    maxPerGroup: 4,
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
