import { useContext, useMemo } from 'react';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { buildLinearScaler, formatUTCMonthShort, formatUTCYear, getAxisTickConfigBySpan, alignToUnitStartUTC, utcDateToYearFraction, yfToUTCDate, formatMarkerLabelUTC, nextTickUTC } from '../../utils';
import CONFIG from '../../config/index.js';
import { getAxisPlan } from '../../utils/axisPlanner.js';

/**
 * @typedef {Object} TimelineAxisProps
 * @property {[number, number]} [domain]
 */

/**
 * @param {TimelineAxisProps} props
 */
export default function TimelineAxis({ domain = CONFIG.axis.defaultDomain }) {
  const { viewport } = useContext(TimelineContext) || { viewport: { scale: 1, pan: 0 } };
  const scale = viewport?.scale ?? 1;
  const pan = viewport?.pan ?? 0; // unit offset (-1..1) applied across width

  const scaler = useMemo(() => buildLinearScaler(domain), [domain]);
  // Compute visible range to derive span-based tick strategy
  
  // Compute visible year range given current scale and pan
  const visibleRange = useMemo(() => {
    // uScaled = (u - 0.5) * scale + 0.5 + pan
    // For uScaled in [0,1], solve for u at edges 0 and 1
    const uMin = ((0 - 0.5) - pan) / scale + 0.5;
    const uMax = ((1 - 0.5) - pan) / scale + 0.5;
    const yMin = scaler.fromUnit(Math.max(0, Math.min(1, uMin)));
    const yMax = scaler.fromUnit(Math.max(0, Math.min(1, uMax)));
    const a = Math.min(yMin, yMax);
    const b = Math.max(yMin, yMax);
    // small buffer to avoid label popping
    const pad = (b - a) * CONFIG.axis.visiblePadRatio;
    return [a - pad, b + pad];
  }, [pan, scale, scaler]);

  const usePlanner = CONFIG.axis?.plannerEnabled === true;
  const tickCfg = useMemo(() => {
    if (usePlanner) {
      // Derive unit/step from planner for full coherence
      const plan = getAxisPlan({ domain, scale, pan, scaler });
      return { unit: plan.unit, step: plan.step, showLabels: true };
    }
    // Legacy: span derived ONLY from zoom level to keep ticks stable while panning
    const spanByScale = Math.max(1e-9, (domain?.[1] ?? 1) - (domain?.[0] ?? 0)) / Math.max(1e-9, scale || 1);
    return getAxisTickConfigBySpan(spanByScale);
  }, [domain, scale, pan, scaler, usePlanner]);

  // Context markers: always show helpful anchors at the top
  // - year unit: yearly markers by configured step
  // - month unit: year markers
  // - week/day units: month-start markers with Mon YYYY
  // - hour/minute units: day-start markers with D Mon YYYY
  const markers = useMemo(() => {
    if (usePlanner) {
      const plan = getAxisPlan({ domain, scale, pan, scaler });
      return plan.markers || [];
    }
    const [vMin, vMax] = visibleRange;
    const arr = [];
    if (tickCfg.unit === 'year') {
      const rawStart = Math.floor(vMin);
      const rawEnd = Math.ceil(vMax);
      const step = tickCfg.step || 1;
      const start = Math.ceil(rawStart / step) * step;
      const end = Math.floor(rawEnd / step) * step;
      for (let y = start; y <= end; y += step) arr.push({ yf: y, label: formatUTCYear(y) });
      return arr;
    }
    // Helper to push if within range
    const pushIfIn = (yf, label) => { if (yf >= vMin && yf <= vMax) arr.push({ yf, label }); };
    if (tickCfg.unit === 'month') {
      // Add a year marker for the span if present
      const yStart = Math.floor(vMin);
      const yEnd = Math.ceil(vMax);
      for (let y = yStart; y <= yEnd; y++) {
        pushIfIn(y, formatUTCYear(y));
      }
    } else if (tickCfg.unit === 'week' || tickCfg.unit === 'day') {
      // Month-start markers via helpers
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
    } else if (tickCfg.unit === 'hour' || tickCfg.unit === 'minute') {
      // Day-start markers via helpers
      const maxMarkers = CONFIG.axis.maxDayTicks || 1200;
      let count = 0;
      let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'day');
      while (d && utcDateToYearFraction(d) <= vMax && count <= maxMarkers) {
        const yf = utcDateToYearFraction(d);
        if (yf != null && yf >= vMin && yf <= vMax) pushIfIn(yf, formatMarkerLabelUTC(d, 'day'));
        d = nextTickUTC(d, 'day', 1);
        count++;
      }
    }
    return arr;
  }, [visibleRange, tickCfg.unit, tickCfg.step, usePlanner, domain, scale, pan, scaler]);

  // When we switch to weeks (and finer), move year markers to the top of the axis
  const yearsOnTop = useMemo(() => {
    return tickCfg?.unit && ['month', 'week', 'day', 'hour', 'minute'].includes(tickCfg.unit);
  }, [tickCfg?.unit]);

  // Build finer ticks (months/days/hours) within visible range
  const fineTicks = useMemo(() => {
    if (usePlanner) {
      const plan = getAxisPlan({ domain, scale, pan, scaler });
      return plan.spans || [];
    }
    const [vMin, vMax] = visibleRange;
    const items = [];
    const unit = tickCfg.unit;
    const step = tickCfg.step || 1;
    if (unit === 'month') {
      const yStart = Math.floor(vMin);
      const yEnd = Math.ceil(vMax);
      for (let y = yStart; y <= yEnd; y++) {
        for (let m = 1; m <= 12; m += step) {
          const yf = y + (m - 1) / 12;
          if (yf < vMin || yf > vMax) continue;
          items.push({ type: 'month', y, m, yf });
        }
      }
    } else if (unit === 'day') {
      const maxTicks = CONFIG.axis.maxDayTicks; // safety cap
      let count = 0;
      let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'day');
      while (d && count <= maxTicks) {
        const yf = utcDateToYearFraction(d);
        if (yf == null || yf > vMax) break;
        if (yf >= vMin) items.push({ type: 'day', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), yf });
        d = nextTickUTC(d, 'day', step);
        count++;
      }
    } else if (unit === 'hour') {
      const maxTicks = CONFIG.axis.maxHourTicks; // safety cap
      let count = 0;
      let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'hour');
      while (d && count <= maxTicks) {
        const yf = utcDateToYearFraction(d);
        if (yf == null || yf > vMax) break;
        if (yf >= vMin) items.push({ type: 'hour', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), yf });
        d = nextTickUTC(d, 'hour', step);
        count++;
      }
    } else if (unit === 'minute') {
      const maxTicks = CONFIG.axis.maxMinuteTicks; // safety cap
      let count = 0;
      let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'minute');
      while (d && count <= maxTicks) {
        const yf = utcDateToYearFraction(d);
        if (yf == null || yf > vMax) break;
        if (yf >= vMin) items.push({ type: 'minute', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), yf });
        d = nextTickUTC(d, 'minute', step);
        count++;
      }
    } else if (unit === 'week') {
      const maxTicks = CONFIG.axis.maxDayTicks; // reuse day cap
      let count = 0;
      let d = alignToUnitStartUTC(yfToUTCDate(vMin), 'day');
      // Shift to configured week start
      if (d) {
        const dow = d.getUTCDay();
        if (CONFIG.axis?.weekStart === 'sunday') {
          d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow, 0, 0, 0, 0));
        } else {
          const iso = (dow + 6) % 7;
          d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - iso, 0, 0, 0, 0));
        }
      }
      while (d && count <= maxTicks) {
        const yf = utcDateToYearFraction(d);
        if (yf == null || yf > vMax) break;
        if (yf >= vMin) items.push({ type: 'week', y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), yf });
        d = nextTickUTC(d, 'day', 7);
        count++;
      }
    }
    return items;
  }, [tickCfg.unit, tickCfg.step, visibleRange, usePlanner, domain, scale, pan, scaler]);

  // Horizontal only
  return (
    <div className="w-full h-16 relative overflow-hidden">
      <div className="absolute inset-x-0 top-8 border-t border-slate-300" />
      {(() => {
        // Precompute positions for existing markers
        const pos = markers.map((mk) => {
          const u = scaler.toUnit(mk.yf);
          const uScaled = (u - 0.5) * scale + 0.5 + pan;
          return { mk, leftPct: uScaled * 100 };
        });
        const gap = Math.max(0, CONFIG.axis?.edgePinMinGapPct ?? 2);
        const minPins = Math.max(0, Math.min(2, CONFIG.axis?.edgePinsMinCount ?? 0));

        // Helpers
        const inView = (p) => p.leftPct >= 0 && p.leftPct <= 100;
        const firstInView = pos.find(inView);
        const lastInView = [...pos].reverse().find(inView);

        // Derive marker unit (top anchors) from span unit
        const spanUnit = tickCfg.unit;
        const markerUnit = (spanUnit === 'month' || spanUnit === 'year') ? 'year'
          : (spanUnit === 'week' || spanUnit === 'day') ? 'month'
          : 'day';
        // Build edge synthetic markers from visible range
        const [vMin, vMax] = visibleRange;
        // Align edge dates using helpers
        const leftDate = alignToUnitStartUTC(yfToUTCDate(vMin), markerUnit);
        const rightDate = alignToUnitStartUTC(yfToUTCDate(vMax), markerUnit);
        const leftEdge = { yf: utcDateToYearFraction(leftDate), label: formatMarkerLabelUTC(leftDate, markerUnit) };
        const rightEdge = { yf: utcDateToYearFraction(rightDate), label: formatMarkerLabelUTC(rightDate, markerUnit) };

        // Decide whether to show synthetic pins: always honor minPins; handle duplicates by suppressing in-view items instead
        const showLeftPin = minPins >= 1;
        const showRightPin = minPins >= 2;

        // Render existing in-view markers (suppress near-edge if pin shown)
        const rendered = pos.map((p, i) => {
          if (!inView(p)) return null;
          if (showLeftPin && p.leftPct <= gap && p.mk.label === leftEdge.label) return null;
          if (showRightPin && p.leftPct >= (100 - gap) && p.mk.label === rightEdge.label) return null;
          return (
            <div
              key={`mk-${i}-${p.mk.yf}`}
              className={`absolute ${yearsOnTop ? 'top-0' : 'top-6'} text-[11px] text-slate-600 select-none`}
              style={{ left: `${p.leftPct}%`, transform: 'translateX(-50%)' }}
            >
              {yearsOnTop ? (
                <>
                  <div className="mb-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'center' }}>{p.mk.label}</div>
                  <div className="w-px h-3 bg-slate-400 mx-auto" />
                </>
              ) : (
                <>
                  <div className="w-px h-3 bg-slate-400 mx-auto" />
                  <div className="mt-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'center' }}>{p.mk.label}</div>
                </>
              )}
            </div>
          );
        });

        // Render synthetic left/right pins
        if (showLeftPin) {
          rendered.push(
            <div
              key={`mk-pin-left-${leftEdge.yf}`}
              className={`absolute ${yearsOnTop ? 'top-0' : 'top-6'} text-[11px] text-slate-600 select-none z-10`}
              style={{ left: '0%', transform: 'translateX(0%)' }}
            >
              {yearsOnTop ? (
                <>
                  <div className="mb-1 tabular-nums whitespace-nowrap bg-white px-3 pr-6 rounded-sm" style={{ textAlign: 'left' }}>{leftEdge.label}</div>
                  <div className="w-px h-3 bg-slate-400" />
                </>
              ) : (
                <>
                  <div className="w-px h-3 bg-slate-400" />
                  <div className="mt-1 tabular-nums whitespace-nowrap bg-white px-3 pr-6 rounded-sm" style={{ textAlign: 'left' }}>{leftEdge.label}</div>
                </>
              )}
            </div>
          );
        }
        if (showRightPin) {
          rendered.push(
            <div
              key={`mk-pin-right-${rightEdge.yf}`}
              className={`absolute ${yearsOnTop ? 'top-0' : 'top-6'} text-[11px] text-slate-600 select-none z-10`}
              style={{ left: '100%', transform: 'translateX(-100%)' }}
            >
              {yearsOnTop ? (
                <>
                  <div className="mb-1 tabular-nums whitespace-nowrap bg-white px-3 pl-6 rounded-sm" style={{ textAlign: 'right' }}>{rightEdge.label}</div>
                  <div className="w-px h-3 bg-slate-400 mx-auto" />
                </>
              ) : (
                <>
                  <div className="w-px h-3 bg-slate-400 mx-auto" />
                  <div className="mt-1 tabular-nums whitespace-nowrap bg-white px-3 pl-6 rounded-sm" style={{ textAlign: 'right' }}>{rightEdge.label}</div>
                </>
              )}
            </div>
          );
        }

        return rendered;
      })()}
      {(() => {
        // Decimate labels to avoid overcrowding, but keep it STABLE w.r.t. panning
        const maxLabels = CONFIG.axis.maxLabels || 12;
        const spanByScale = Math.max(1e-9, (domain?.[1] ?? 1) - (domain?.[0] ?? 0)) / Math.max(1e-9, scale || 1);
        const unit = tickCfg.unit;
        const step = tickCfg.step || 1;
        const perYear = unit === 'minute' ? (365 * 24 * 60) : unit === 'hour' ? (365 * 24) : unit === 'day' ? 365 : unit === 'week' ? 52 : unit === 'month' ? 12 : 1;
        const estimatedTicks = (perYear * spanByScale) / Math.max(1e-9, step);
        const stride = Math.max(1, Math.ceil(estimatedTicks / maxLabels));
        // Build a set of integer years from markers whose label looks like a year
        const yearSet = new Set(
          markers
            .map(m => (/^[-+]?\d{1,6}$/.test(String(m.label)) ? Math.trunc(m.yf) : null))
            .filter(v => v != null)
        );
        return fineTicks.map((it, idx) => {
          const u = scaler.toUnit(it.yf);
          const uScaled = (u - 0.5) * scale + 0.5 + pan;
          const leftPct = uScaled * 100;
          if (leftPct < 0 || leftPct > 100) return null; // skip out-of-view fine ticks
          const isMajor = (it.type === 'month' && it.m === 1) || (it.type === 'day' && it.d === 1) || (it.type === 'hour' && it.h === 0);
          const label = (() => {
            if (!tickCfg.showLabels) return '';
            // Month: suppress January if year marker exists at same spot
            if (it.type === 'month') {
              if (it.m === 1 && yearSet.has(it.y)) return '';
              return `${formatUTCMonthShort(it.y, it.m)}`;
            }
            // Pan-invariant decimation for dense time units using absolute time modulo
            if (it.type === 'hour' || it.type === 'minute') {
              const epochMs = Date.UTC(1970, 0, 1, 0, 0, 0, 0);
              const tMs = Date.UTC(it.y, (it.m || 1) - 1, it.d || 1, it.h || 0, it.min || 0, 0, 0);
              const unitMs = it.type === 'hour' ? (60 * 60 * 1000) : (60 * 1000);
              const k = Math.floor((tMs - epochMs) / (unitMs * Math.max(1, step)));
              if ((k % stride) !== 0) return '';
            }
            if (it.type === 'day') {
              try {
                const d = new Date(Date.UTC(it.y, it.m - 1, it.d));
                const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
                return (isMajor ? fmt.format(d) + ' ' + formatUTCYear(it.y) : fmt.format(d));
              } catch { return `${it.d}`; }
            }
            if (it.type === 'week') {
              try {
                const d = new Date(Date.UTC(it.y, it.m - 1, it.d));
                const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
                return fmt.format(d);
              } catch { return ''; }
            }
            if (it.type === 'hour') {
              const time = `${String(it.h).padStart(2, '0')}:00`;
              if (CONFIG.axis.contextLabels) {
                try {
                  const d = new Date(Date.UTC(it.y, (it.m || 1) - 1, it.d || 1));
                  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
                  return `${time} • ${fmt.format(d)}`;
                } catch {}
              }
              return time;
            }
            if (it.type === 'minute') {
              const time = `${String(it.h).padStart(2, '0')}:${String(it.min).padStart(2, '0')}`;
              if (CONFIG.axis.contextLabels) {
                try {
                  const d = new Date(Date.UTC(it.y, (it.m || 1) - 1, it.d || 1));
                  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
                  return `${time} • ${fmt.format(d)}`;
                } catch {}
              }
              return time;
            }
            return '';
          })();
          return (
            <div key={`${it.type}-${it.y}-${it.m || 0}-${it.d || 0}-${it.h || 0}-${it.min || 0}`} className="absolute top-8 select-none" style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}>
              <div className={`w-px ${isMajor ? 'h-3 bg-slate-400' : 'h-2 bg-slate-300/80' } mx-auto`} />
              {label && (
                <div className="mt-1 text-[10px] text-slate-500 tabular-nums whitespace-nowrap truncate max-w-[140px]">{label}</div>
              )}
            </div>
          );
        });
      })()}
    </div>
  );
}
