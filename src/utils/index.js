// Utility placeholders. Implementations will expand in later phases.

// Sanitize text by trimming and escaping HTML special chars to prevent XSS
export const sanitizeText = (s = '') => {
  const str = String(s).trim();
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
export const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
export const debounce = (fn, delay = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

// Linear scaler builder (year -> [0,1]) with zoom scale applied externally if needed
export function buildLinearScaler(domain) {
  const [min, max] = domain;
  const span = Math.max(1, max - min);
  return {
    toUnit: (year) => (year - min) / span,
    fromUnit: (u) => min + u * span,
  };
}

// Decide marker step based on scale (rough heuristic for Phase 2)
export function getMarkerStepByScale(scale) {
  if (scale > 3) return 1;     // years
  if (scale > 2) return 5;     // 5 years
  if (scale > 1) return 10;    // decades
  if (scale > 0.5) return 20;  // 20-year steps
  return 50;                    // 50-year steps
}

export function buildDecadeMarkers(domain, scale) {
  const [min, max] = domain;
  const step = getMarkerStepByScale(scale);
  const start = Math.floor(min / step) * step;
  const markers = [];
  for (let y = start; y <= max; y += step) {
    if (y >= min) markers.push(y);
  }
  return markers;
}

// Clamp a year to valid range
export function clampYear(y, min = 1900, max = 2100) {
  const n = Number(y);
  if (!Number.isFinite(n)) return min;
  return clamp(n, min, max);
}

// Content-aware pan clamping based on scale. When scale=1, pan=0; when scale>1, allow panning within bounds
// We treat the unit domain [0..1] scaled about center with factor S, then shifted by pan P.
// Bounds: P in [-(S-1)/(2S), +(S-1)/(2S)]
export function clampPan(pan, scale = 1) {
  const S = Math.max(0.1, Number(scale) || 1);
  if (S <= 1) return 0; // no pan needed when content fits
  const bound = (S - 1) / (2 * S);
  return clamp(Number(pan) || 0, -bound, bound);
}

// Compare two partial date objects. Undefined parts are treated as 0.
// Returns -1, 0, 1
export function comparePartialDate(a = {}, b = {}) {
  const parts = ['year', 'month', 'day', 'hour', 'minute'];
  for (const p of parts) {
    const av = Number(a[p] ?? 0);
    const bv = Number(b[p] ?? 0);
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

// Stable sort of events by timestamp per spec: year -> month -> day -> hour -> minute
export function sortEventsByTimestamp(events = []) {
  return events
    .map((e, i) => ({ e, i }))
    .sort((x, y) => {
      const cmp = comparePartialDate(x.e?.start, y.e?.start);
      if (cmp !== 0) return cmp;
      // Stable fallback by original index
      return x.i - y.i;
    })
    .map((wrapped) => wrapped.e);
}
