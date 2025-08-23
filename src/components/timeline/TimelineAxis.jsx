import { useContext, useMemo } from 'react';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { buildLinearScaler, formatUTCMonthShort, formatUTCYear, getAxisTickConfigBySpan, toYearFraction } from '../../utils';
import CONFIG from '../../config/index.js';

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

  const tickCfg = useMemo(() => {
    // Use span derived ONLY from zoom level to keep ticks stable while panning
    const spanByScale = Math.max(1e-9, (domain?.[1] ?? 1) - (domain?.[0] ?? 0)) / Math.max(1e-9, scale || 1);
    return getAxisTickConfigBySpan(spanByScale);
  }, [domain, scale]);

  // Year markers derived from visible span and canonical base
  const markers = useMemo(() => {
    const [vMin, vMax] = visibleRange;
    const rawStart = Math.floor(vMin);
    const rawEnd = Math.ceil(vMax);
    const step = tickCfg.unit === 'year' ? (tickCfg.step || 1) : 1; // stable year step from span-based cfg
    const arr = [];
    const start = Math.ceil(rawStart / step) * step; // align to multiple of step
    const end = Math.floor(rawEnd / step) * step;
    for (let y = start; y <= end; y += step) arr.push(y);
    return arr;
  }, [visibleRange, tickCfg.unit, tickCfg.step]);

  // When we switch to weeks (and finer), move year markers to the top of the axis
  const yearsOnTop = useMemo(() => {
    return tickCfg?.unit && ['month', 'week', 'day', 'hour', 'minute'].includes(tickCfg.unit);
  }, [tickCfg?.unit]);

  // Build finer ticks (months/days/hours) within visible range
  const fineTicks = useMemo(() => {
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
      // Iterate days via UTC Date to handle month lengths/leap years
      const startYear = Math.floor(vMin);
      const endYear = Math.ceil(vMax);
      const maxTicks = CONFIG.axis.maxDayTicks; // safety cap
      let count = 0;
      for (let y = startYear; y <= endYear; y++) {
        const start = Date.UTC(y, 0, 1, 0, 0, 0, 0);
        const end = Date.UTC(y + 1, 0, 1, 0, 0, 0, 0);
        const dayMs = 24 * 60 * 60 * 1000 * step;
        for (let t = start; t < end; t += dayMs) {
          const d = new Date(t);
          const yy = d.getUTCFullYear();
          const mm = d.getUTCMonth() + 1;
          const dd = d.getUTCDate();
          const yf = toYearFraction({ year: yy, month: mm, day: dd });
          if (yf == null || yf < vMin || yf > vMax) continue;
          items.push({ type: 'day', y: yy, m: mm, d: dd, yf });
          if (++count > maxTicks) break;
        }
        if (count > maxTicks) break;
      }
    } else if (unit === 'hour') {
      const startYear = Math.floor(vMin);
      const endYear = Math.ceil(vMax);
      const maxTicks = CONFIG.axis.maxHourTicks; // safety cap
      let count = 0;
      for (let y = startYear; y <= endYear; y++) {
        for (let m = 1; m <= 12; m++) {
          const daysInThisMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
          for (let d = 1; d <= daysInThisMonth; d++) {
            for (let h = 0; h < 24; h += step) {
              const yf = toYearFraction({ year: y, month: m, day: d, hour: h });
              if (yf == null || yf < vMin || yf > vMax) continue;
              items.push({ type: 'hour', y, m, d, h, yf });
              if (++count > maxTicks) break;
            }
            if (count > maxTicks) break;
          }
          if (count > maxTicks) break;
        }
        if (count > maxTicks) break;
      }
    } else if (unit === 'minute') {
      const startYear = Math.floor(vMin);
      const endYear = Math.ceil(vMax);
      const maxTicks = CONFIG.axis.maxMinuteTicks; // safety cap
      let count = 0;
      for (let y = startYear; y <= endYear; y++) {
        for (let m = 1; m <= 12; m++) {
          const daysInThisMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
          for (let d = 1; d <= daysInThisMonth; d++) {
            for (let h = 0; h < 24; h++) {
              for (let min = 0; min < 60; min += step) {
                const yf = toYearFraction({ year: y, month: m, day: d, hour: h, minute: min });
                if (yf == null || yf < vMin || yf > vMax) continue;
                items.push({ type: 'minute', y, m, d, h, min, yf });
                if (++count > maxTicks) break;
              }
              if (count > maxTicks) break;
            }
            if (count > maxTicks) break;
          }
          if (count > maxTicks) break;
        }
        if (count > maxTicks) break;
      }
    } else if (unit === 'week') {
      // Week alignment: start of week per CONFIG.axis.weekStart at 00:00 UTC
      const maxTicks = CONFIG.axis.maxDayTicks; // reuse day cap (weeks are fewer)
      let count = 0;
      // Start from the beginning of span
      const startDate = new Date(Date.UTC(Math.floor(vMin), 0, 1, 0, 0, 0, 0));
      // Move to vMin date
      const vMinYear = Math.floor(vMin);
      const vMinMsBase = Date.UTC(vMinYear, 0, 1, 0, 0, 0, 0);
      const fracMs = (vMin - vMinYear) * (Date.UTC(vMinYear + 1, 0, 1) - vMinMsBase);
      const firstMs = vMinMsBase + Math.max(0, Math.floor(fracMs));
      let d = new Date(firstMs);
      // Shift to the configured week start (Monday=1 or Sunday=0)
      const desired = (CONFIG.axis?.weekStart === 'sunday') ? 0 : 1;
      const dow = d.getUTCDay(); // 0=Sun,1=Mon,...6=Sat
      const delta = (desired - dow + 7) % 7; // 0..6 days to add
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + delta, 0, 0, 0, 0));
      while (true) {
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const day = d.getUTCDate();
        const yf = toYearFraction({ year: y, month: m, day });
        if (yf == null || yf > vMax) break;
        if (yf >= vMin) items.push({ type: 'week', y, m, d: day, yf });
        if (++count > maxTicks) break;
        d = new Date(Date.UTC(y, m - 1, day + 7, 0, 0, 0, 0));
      }
    }
    return items;
  }, [tickCfg.unit, tickCfg.step, visibleRange]);

  // Horizontal only
  return (
    <div className="w-full h-16 relative overflow-hidden">
      <div className="absolute inset-x-0 top-8 border-t border-slate-300" />
      {markers.map((y) => {
        const u = scaler.toUnit(y);
        const uScaled = (u - 0.5) * scale + 0.5 + pan; // scale around center, then pan
        const leftPct = uScaled * 100;
        if (leftPct < 0 || leftPct > 100) return null; // skip out-of-view markers instead of clamping
        return (
          <div
            key={y}
            className={`absolute ${yearsOnTop ? 'top-0' : 'top-6'} text-[11px] text-slate-600 select-none`}
            style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
          >
            {yearsOnTop ? (
              <>
                <div className="mb-1 tabular-nums whitespace-nowrap">{formatUTCYear(y)}</div>
                <div className="w-px h-3 bg-slate-400 mx-auto" />
              </>
            ) : (
              <>
                <div className="w-px h-3 bg-slate-400 mx-auto" />
                <div className="mt-1 tabular-nums whitespace-nowrap">{formatUTCYear(y)}</div>
              </>
            )}
          </div>
        );
      })}
      {(() => {
        // Decimate labels to avoid overcrowding, but keep it STABLE w.r.t. panning
        const maxLabels = CONFIG.axis.maxLabels || 12;
        const spanByScale = Math.max(1e-9, (domain?.[1] ?? 1) - (domain?.[0] ?? 0)) / Math.max(1e-9, scale || 1);
        const unit = tickCfg.unit;
        const step = tickCfg.step || 1;
        const perYear = unit === 'minute' ? (365 * 24 * 60) : unit === 'hour' ? (365 * 24) : unit === 'day' ? 365 : unit === 'week' ? 52 : unit === 'month' ? 12 : 1;
        const estimatedTicks = (perYear * spanByScale) / Math.max(1e-9, step);
        const stride = Math.max(1, Math.ceil(estimatedTicks / maxLabels));
        const yearSet = new Set(markers);
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
