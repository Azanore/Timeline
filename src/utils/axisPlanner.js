// Axis planner: produces two coherent tracks for the timeline axis
// - spans: bottom ticks (fine-grained units)
// - markers: top anchors (higher-level context)
// Outputs are aligned to UTC calendar boundaries and are stable under pan.

import CONFIG from '../config/index.js';
import {
  getAxisTickConfigBySpan,
  formatUTCYear,
  alignToUnitStartUTC,
  nextTickUTC,
  utcDateToYearFraction,
  yfToUTCDate,
  formatMarkerLabelUTC,
} from './index.js';

/**
 * @typedef {{ yf:number, label?:string, type?:string, y?:number, m?:number, d?:number, h?:number, min?:number, major?:boolean }} AxisTick
 * @typedef {{ unit:string, step:number, spans:AxisTick[], markers:AxisTick[] }} AxisPlan
 */

/**
 * Compute visible year range from domain/scale/pan using provided scaler.
 * Returned as [minYear, maxYear] with small pad to avoid popping.
 */
function getVisibleRange(domain, scale, pan, scaler) {
  const uMin = ((0 - 0.5) - pan) / scale + 0.5;
  const uMax = ((1 - 0.5) - pan) / scale + 0.5;
  const yMin = scaler.fromUnit(Math.max(0, Math.min(1, uMin)));
  const yMax = scaler.fromUnit(Math.max(0, Math.min(1, uMax)));
  const a = Math.min(yMin, yMax);
  const b = Math.max(yMin, yMax);
  const pad = (b - a) * CONFIG.axis.visiblePadRatio;
  return [a - pad, b + pad];
}

/** Build markers for the given unit using the design rules */
function buildMarkers(unit, step, vMin, vMax) {
  const arr = [];
  const pushIfIn = (yf, label) => { if (yf >= vMin && yf <= vMax) arr.push({ yf, label }); };
  if (unit === 'year') {
    const rawStart = Math.floor(vMin);
    const rawEnd = Math.ceil(vMax);
    const s = step || 1;
    const start = Math.ceil(rawStart / s) * s;
    const end = Math.floor(rawEnd / s) * s;
    for (let y = start; y <= end; y += s) arr.push({ yf: y, label: formatUTCYear(y) });
    return arr;
  }
  if (unit === 'month') {
    const yStart = Math.floor(vMin);
    const yEnd = Math.ceil(vMax);
    for (let y = yStart; y <= yEnd; y++) pushIfIn(y, formatUTCYear(y));
    return arr;
  }
  if (unit === 'week' || unit === 'day') {
    const yStart = Math.floor(vMin);
    const yEnd = Math.ceil(vMax);
    for (let y = yStart; y <= yEnd; y++) {
      for (let m = 1; m <= 12; m++) {
        const d = new Date(Date.UTC(y, m - 1, 1));
        const yf = utcDateToYearFraction(d);
        if (yf == null) continue;
        pushIfIn(yf, formatMarkerLabelUTC(d, 'month'));
      }
    }
    return arr;
  }
  // hour/minute -> day-start markers
  const maxMarkers = CONFIG.axis.maxDayTicks || 1200;
  let count = 0;
  let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'day');
  while (d && utcDateToYearFraction(d) <= vMax && count <= maxMarkers) {
    const yf = utcDateToYearFraction(d);
    if (yf != null && yf >= vMin && yf <= vMax) pushIfIn(yf, formatMarkerLabelUTC(d, 'day'));
    d = nextTickUTC(d, 'day', 1);
    count++;
  }
  return arr;
}

/** Build spans (fine ticks) for the given unit */
function buildSpans(unit, step, vMin, vMax) {
  const items = [];
  if (unit === 'month') {
    const yStart = Math.floor(vMin);
    const yEnd = Math.ceil(vMax);
    for (let y = yStart; y <= yEnd; y++) {
      for (let m = 1; m <= 12; m += step) {
        const yf = y + (m - 1) / 12;
        if (yf < vMin || yf > vMax) continue;
        items.push({ type: 'month', y, m, yf, major: m === 1 });
      }
    }
    return items;
  }
  if (unit === 'day') {
    const maxTicks = CONFIG.axis.maxDayTicks;
    let count = 0;
    let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'day');
    while (d && count <= maxTicks) {
      const yf = utcDateToYearFraction(d);
      if (yf == null || yf > vMax) break;
      if (yf >= vMin) {
        items.push({ type: 'day', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), yf, major: d.getUTCDate() === 1 });
      }
      d = nextTickUTC(d, 'day', step);
      count++;
    }
    return items;
  }
  if (unit === 'hour') {
    const maxTicks = CONFIG.axis.maxHourTicks;
    let count = 0;
    let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'hour');
    while (d && count <= maxTicks) {
      const yf = utcDateToYearFraction(d);
      if (yf == null || yf > vMax) break;
      if (yf >= vMin) {
        items.push({ type: 'hour', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), yf, major: d.getUTCHours() === 0 });
      }
      d = nextTickUTC(d, 'hour', step);
      count++;
    }
    return items;
  }
  if (unit === 'minute') {
    const maxTicks = CONFIG.axis.maxMinuteTicks;
    let count = 0;
    let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'minute');
    while (d && count <= maxTicks) {
      const yf = utcDateToYearFraction(d);
      if (yf == null || yf > vMax) break;
      if (yf >= vMin) {
        items.push({ type: 'minute', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), yf, major: (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) });
      }
      d = nextTickUTC(d, 'minute', step);
      count++;
    }
    return items;
  }
  if (unit === 'week') {
    const maxTicks = CONFIG.axis.maxDayTicks;
    let count = 0;
    let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'day');
    // Adjust to desired week start
    if (d) {
      const dow = d.getUTCDay(); // 0..6, Sun..Sat
      if ((CONFIG.axis?.weekStart === 'sunday')) {
        // Move back to Sunday
        d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow, 0, 0, 0, 0));
      } else {
        // ISO Monday
        const iso = (dow + 6) % 7; // Mon=0..Sun=6
        d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - iso, 0, 0, 0, 0));
      }
    }
    while (d && count <= maxTicks) {
      const yf = utcDateToYearFraction(d);
      if (yf == null || yf > vMax) break;
      if (yf >= vMin) items.push({ type: 'week', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), yf, major: d.getUTCDate() <= 7 });
      d = nextTickUTC(d, 'day', 7);
      count++;
    }
    return items;
  }
  // Fallback: years (coarse)
  const yStart = Math.floor(vMin);
  const yEnd = Math.ceil(vMax);
  const s = Math.max(1, step || 1);
  for (let y = yStart; y <= yEnd; y += s) {
    if (y < vMin || y > vMax) continue;
    items.push({ type: 'year', y, yf: y, major: true });
  }
  return items;
}

/**
 * getAxisPlan
 * @param {{ domain:[number,number], scale:number, pan:number, scaler:{toUnit:Function,fromUnit:Function} }} params
 * @returns {AxisPlan}
 */
export function getAxisPlan({ domain, scale, pan, scaler }) {
  const spanByScale = Math.max(1e-9, (domain?.[1] ?? 1) - (domain?.[0] ?? 0)) / Math.max(1e-9, scale || 1);
  let cfg = getAxisTickConfigBySpan(spanByScale);
  // Hysteresis: preserve previous unit/step if scale change is small
  const hysteresisPct = Math.max(0, CONFIG.axis?.plannerHysteresisScalePct ?? 0);
  if (hysteresisPct > 0) {
    const key = 'default'; // Single-axis cache; extend if multiple axes needed
    if (!getAxisPlan._cache) getAxisPlan._cache = new Map();
    const last = getAxisPlan._cache.get(key);
    if (last && last.scale > 0) {
      const rel = Math.abs(scale - last.scale) / last.scale;
      if (rel < hysteresisPct && last.unit && cfg.unit && last.unit !== cfg.unit) {
        // Keep previous unit/step to avoid flicker
        cfg = { unit: last.unit, step: last.step, showLabels: true };
      }
    }
    // store proposed for next call
    getAxisPlan._cache.set(key, { scale, unit: cfg.unit, step: cfg.step || 1 });
  }
  const [vMin, vMax] = getVisibleRange(domain, scale, pan, scaler);
  const unit = cfg.unit;
  const step = cfg.step || 1;
  const spans = buildSpans(unit, step, vMin, vMax);
  const markers = buildMarkers(unit, step, vMin, vMax);
  return { unit, step, spans, markers };
}
