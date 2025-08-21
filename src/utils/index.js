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

// Adaptive axis ticks with clear thresholds for different time units
export function getAxisTickConfig(scale) {
  // Clear thresholds for decades/years/months/days/hours
  if (scale >= 50) return { unit: 'hour', step: 1, showLabels: true };
  if (scale >= 25) return { unit: 'hour', step: 6, showLabels: true };
  if (scale >= 15) return { unit: 'day', step: 1, showLabels: true };
  if (scale >= 10) return { unit: 'day', step: 7, showLabels: true }; // weeks
  if (scale >= 8) return { unit: 'month', step: 1, showLabels: true };
  if (scale >= 6) return { unit: 'month', step: 3, showLabels: true }; // quarters
  if (scale >= 4) return { unit: 'year', step: 1, showLabels: true };
  if (scale >= 2) return { unit: 'year', step: 5, showLabels: true };
  if (scale >= 1) return { unit: 'year', step: 10, showLabels: true }; // decades
  if (scale >= 0.5) return { unit: 'year', step: 20, showLabels: false };
  return { unit: 'year', step: 50, showLabels: false };
}

// Legacy function for backward compatibility - now uses new adaptive system
export function getMarkerStepByScale(scale) {
  const config = getAxisTickConfig(scale);
  return config.unit === 'year' ? config.step : 1;
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

// Convert a partial date object to a fractional year for positioning
// Accepts { year, month?, day?, hour?, minute? } where parts can be undefined/empty
export function isLeapYear(y) {
  y = Number(y);
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

export function daysInMonth(y, m) {
  const md = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return md[Math.max(1, Math.min(12, Number(m))) - 1] || 31;
}

export function toYearFraction(d = {}) {
  const y = Number(d.year);
  if (!Number.isFinite(y)) return null;
  const month = Number(d.month || 1);
  const day = Number(d.day || 1);
  const hour = Number(d.hour || 0);
  const minute = Number(d.minute || 0);
  const base = Date.UTC(y, 0, 1, 0, 0, 0, 0);
  const next = Date.UTC(y + 1, 0, 1, 0, 0, 0, 0);
  const yearMs = next - base;
  const t = Date.UTC(y, Math.max(0, month - 1), Math.max(1, Math.min(daysInMonth(y, month), day)), hour, minute, 0, 0);
  const frac = (t - base) / yearMs;
  return y + Math.max(0, Math.min(0.999999999, frac));
}

// UTC helpers for consistent formatting across the app
export function toUTCDate({ year, month = 1, day = 1, hour = 0, minute = 0 } = {}) {
  const y = Number(year);
  if (!Number.isFinite(y)) return null;
  const ms = Date.UTC(y, Math.max(0, Number(month || 1) - 1), Math.max(1, Number(day || 1)), Number(hour || 0), Number(minute || 0));
  return new Date(ms);
}

export function formatUTCMonthShort(year, month) {
  const d = toUTCDate({ year, month: Math.max(1, Math.min(12, month)) });
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(d);
  } catch {
    // Fallback
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return names[Math.max(1, Math.min(12, month)) - 1];
  }
}

export function formatUTCYear(year) {
  return String(Math.trunc(Number(year) || 0));
}

// Format a partial UTC date consistently to full precision (year→minute) when provided
// Accepts possibly missing month/day/hour/minute; only renders the parts that exist
// Examples:
// {year:2020} -> "2020"
// {year:2020, month:5} -> "2020-05"
// {year:2020, month:5, day:3} -> "2020-05-03"
// {year:2020, month:5, day:3, hour:9} -> "2020-05-03 09:00"
// {year:2020, month:5, day:3, hour:9, minute:7} -> "2020-05-03 09:07"
export function formatPartialUTC(d = {}) {
  const y = Number(d?.year);
  if (!Number.isFinite(y)) return '';
  const mm = d?.month != null && d.month !== '' ? String(Number(d.month)).padStart(2, '0') : null;
  const dd = d?.day != null && d.day !== '' ? String(Number(d.day)).padStart(2, '0') : null;
  const hh = d?.hour != null && d.hour !== '' ? String(Number(d.hour)).padStart(2, '0') : null;
  const min = d?.minute != null && d.minute !== '' ? String(Number(d.minute)).padStart(2, '0') : null;

  const datePart = [String(Math.trunc(y)), mm, dd].filter(Boolean).join('-');
  if (hh == null && min == null) return datePart;
  const timePart = `${hh ?? '00'}:${min ?? '00'}`;
  return datePart ? `${datePart} ${timePart}` : timePart;
}

// Centralized type color legend
export const typeLegend = {
  history: { key: 'rose', dot: 'bg-rose-600', border: 'rose' },
  personal: { key: 'emerald', dot: 'bg-emerald-600', border: 'emerald' },
  science: { key: 'blue', dot: 'bg-blue-600', border: 'blue' },
  culture: { key: 'violet', dot: 'bg-violet-600', border: 'violet' },
  tech: { key: 'amber', dot: 'bg-amber-500', border: 'amber' },
  other: { key: 'slate', dot: 'bg-slate-600', border: 'slate' },
};

// Snap scale to friendly levels for label stability
export function snapScale(s) {
  // Snap only at meaningful thresholds that align with axis tick transitions
  // Within current clamp [0.1..5], the effective unit transitions occur near 0.5, 1, 2, and 4.
  // Keep 5 as a terminal level for convenience.
  const levels = [0.5, 1, 2, 4, 5];
  const clampS = clamp(s, 0.1, 5);
  let best = levels[0];
  let bestDiff = Math.abs(clampS - best);
  for (const lv of levels) {
    const d = Math.abs(clampS - lv);
    if (d < bestDiff) { best = lv; bestDiff = d; }
  }
  // Only snap if close enough (within 0.06)
  return bestDiff <= 0.06 ? best : clampS;
}

// Very lightweight positional clustering by rounding unit positions.
// items: [{ key, uScaled (0..1), data }]
export function clusterByPosition(items, bucketSize = 0.015, opts = {}) {
  const edgePad = Math.max(0, Math.min(0.1, opts.edgePad || 0));
  const clamp01 = (v) => clamp(v, 0, 1);
  const buckets = new Map();
  for (const it of items) {
    const u = clamp01(it.uScaled || 0);
    const uPad = edgePad > 0 ? clamp(u, edgePad, 1 - edgePad) : u;
    const b = Math.round(uPad / bucketSize) * bucketSize;
    const key = b.toFixed(3);
    const arr = buckets.get(key) || [];
    arr.push({ ...it, uScaled: u });
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries()).map(([k, arr]) => ({
    bucket: clamp01(Number(k)),
    count: arr.length,
    items: arr,
  }));
}
