import { useContext, useMemo } from 'react';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { buildLinearScaler, buildDecadeMarkers, formatUTCMonthShort, formatUTCYear, getAxisTickConfig, toYearFraction } from '../../utils';
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

  const markers = useMemo(() => buildDecadeMarkers(domain, scale), [domain, scale]);
  const scaler = useMemo(() => buildLinearScaler(domain), [domain]);
  const tickCfg = useMemo(() => getAxisTickConfig(scale), [scale]);

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
    }
    return items;
  }, [tickCfg.unit, tickCfg.step, visibleRange]);

  // Horizontal only
  return (
    <div className="w-full h-16 relative">
      <div className="absolute inset-x-0 top-8 border-t border-slate-300" />
      {markers.map((y) => {
        const u = scaler.toUnit(y);
        const uScaled = (u - 0.5) * scale + 0.5 + pan; // scale around center, then pan
        const left = Math.max(0, Math.min(100, uScaled * 100));
        return (
          <div
            key={y}
            className="absolute top-6 text-[11px] text-slate-600 select-none"
            style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-px h-3 bg-slate-400 mx-auto" />
            <div className="mt-1 tabular-nums">{formatUTCYear(y)}</div>
          </div>
        );
      })}
      {fineTicks.map((it) => {
        const u = scaler.toUnit(it.yf);
        const uScaled = (u - 0.5) * scale + 0.5 + pan;
        const left = Math.max(0, Math.min(100, uScaled * 100));
        const isMajor = (it.type === 'month' && it.m === 1) || (it.type === 'day' && it.d === 1) || (it.type === 'hour' && it.h === 0);
        const label = (() => {
          if (!tickCfg.showLabels) return '';
          if (it.type === 'month') return `${formatUTCMonthShort(it.y, it.m)}${isMajor ? ' ' + formatUTCYear(it.y) : ''}`;
          if (it.type === 'day') {
            try {
              const d = new Date(Date.UTC(it.y, it.m - 1, it.d));
              const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
              return (isMajor ? fmt.format(d) + ' ' + formatUTCYear(it.y) : fmt.format(d));
            } catch { return `${it.d}`; }
          }
          if (it.type === 'hour') return `${String(it.h).padStart(2, '0')}:00`;
          return '';
        })();
        return (
          <div key={`${it.type}-${it.y}-${it.m || 0}-${it.d || 0}-${it.h || 0}`} className="absolute top-8 select-none" style={{ left: `${left}%`, transform: 'translateX(-50%)' }}>
            <div className={`w-px ${isMajor ? 'h-3 bg-slate-400' : 'h-2 bg-slate-300/80' } mx-auto`} />
            {label && (
              <div className="mt-1 text-[10px] text-slate-500 tabular-nums">{label}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

