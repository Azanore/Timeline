import { useContext, useMemo, useRef, useLayoutEffect, useState } from 'react';
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
  // Measure container width to enable pixel-snapped placement for labels
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  // Canvas context for precise text width measurement (near pixel-perfect)
  const measureCtxRef = useRef(null);
  const fontSpecRef = useRef('11px sans-serif');
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setWidth(Math.max(0, Math.round(rect.width)));
      // Update canvas measurement font from computed styles for accuracy
      try {
        const cs = window.getComputedStyle(el);
        const fontSize = cs.fontSize || '11px';
        const fontFamily = cs.fontFamily || 'sans-serif';
        const fontWeight = cs.fontWeight && cs.fontWeight !== 'normal' ? cs.fontWeight + ' ' : '';
        fontSpecRef.current = `${fontWeight}${fontSize} ${fontFamily}`;
        if (!measureCtxRef.current) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          measureCtxRef.current = ctx;
        }
        if (measureCtxRef.current) {
          measureCtxRef.current.font = fontSpecRef.current;
        }
      } catch {}
    };
    measure();
    let ro;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    } else {
      window.addEventListener('resize', measure);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', measure);
    };
  }, []);
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

  // Raw viewport edges WITHOUT padding, used for edge pin labels to be exact
  const rawVisibleRange = useMemo(() => {
    const uMin = ((0 - 0.5) - pan) / scale + 0.5;
    const uMax = ((1 - 0.5) - pan) / scale + 0.5;
    const yMin = scaler.fromUnit(Math.max(0, Math.min(1, uMin)));
    const yMax = scaler.fromUnit(Math.max(0, Math.min(1, uMax)));
    const a = Math.min(yMin, yMax);
    const b = Math.max(yMin, yMax);
    return [a, b];
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
    <div ref={containerRef} className="w-full h-16 relative overflow-hidden">
      <div className="absolute inset-x-0 top-8 border-t border-slate-300" />
      {(() => {
        // Precompute positions for existing markers
        const pos = markers.map((mk) => {
          const u = scaler.toUnit(mk.yf);
          const uScaled = (u - 0.5) * scale + 0.5 + pan;
          const leftPct = uScaled * 100;
          const leftPx = width > 0 ? Math.floor(uScaled * width) : null;
          return { mk, leftPct, leftPx };
        });
        // Single edge-sticky marker: compute in-view markers to decide pinning
        const inView = (p) => {
          if (width > 0 && p.leftPx != null) return p.leftPx >= 0 && p.leftPx < width;
          return p.leftPct >= 0 && p.leftPct < 100;
        };
        const inViewPos = pos.filter(inView);
        // Pin when exactly one is visible and at an edge OR when zero are visible and exactly one is just outside
        let showLeftPin = false;
        let showRightPin = false;
        let pinTarget = null;
        // Pixel threshold to start pinning before label visually overlaps the edge
        const thresholdPx = CONFIG.axis?.pinThresholdPx ?? 6;
        const dynamicThresholdFor = (p) => {
          try {
            const label = p?.mk?.label ?? '';
            // Prefer precise measurement via canvas using container's font
            const ctx = measureCtxRef.current;
            if (ctx && label) {
              try {
                ctx.font = fontSpecRef.current;
                const w = ctx.measureText(label).width || 0;
                const half = w / 2;
                // Add a small buffer to account for subpixel rounding/truncation and tick line
                const precise = Math.round(half + 3);
                return Math.max(thresholdPx, Math.min(72, Math.max(6, precise)));
              } catch {}
            }
            // Fallback heuristic: ~6px/char full-width -> ~3px per char half-width + buffer
            const estimate = Math.round(label.length * 3 + 4);
            return Math.max(thresholdPx, Math.min(72, Math.max(6, estimate)));
          } catch {
            return thresholdPx;
          }
        };
        if (inViewPos.length === 1) {
          const p0 = inViewPos[0];
          pinTarget = p0;
          if (width > 0 && p0.leftPx != null) {
            const dyn = dynamicThresholdFor(p0);
            if (p0.leftPx >= width - dyn) showRightPin = true;
            else if (p0.leftPx <= dyn) showLeftPin = true;
          } else {
            if (p0.leftPct >= 100) showRightPin = true;
            else if (p0.leftPct <= 0) showLeftPin = true;
          }
        } else if (inViewPos.length === 0) {
          // Find nearest markers outside on each side and choose the closer one to pin
          let leftCand = null; // max leftPx < 0 (closest to 0)
          let rightCand = null; // min leftPx >= width (closest to width)
          for (const p of pos) {
            if (width > 0 && p.leftPx != null) {
              if (p.leftPx < 0) {
                if (leftCand == null || p.leftPx > leftCand.leftPx) leftCand = p;
              } else if (p.leftPx >= width) {
                if (rightCand == null || p.leftPx < rightCand.leftPx) rightCand = p;
              }
            } else {
              if (p.leftPct < 0) {
                if (leftCand == null || p.leftPct > leftCand.leftPct) leftCand = p;
              } else if (p.leftPct >= 100) {
                if (rightCand == null || p.leftPct < rightCand.leftPct) rightCand = p;
              }
            }
          }
          // Prefer the closer candidate (distance to edge). If only one side exists, use it.
          if (leftCand && !rightCand) { showLeftPin = true; pinTarget = leftCand; }
          else if (rightCand && !leftCand) { showRightPin = true; pinTarget = rightCand; }
          else if (leftCand && rightCand) {
            const leftDist = (leftCand.leftPx != null && width > 0) ? Math.abs(leftCand.leftPx - 0) : Math.abs(leftCand.leftPct - 0);
            const rightDist = (rightCand.leftPx != null && width > 0) ? Math.abs(rightCand.leftPx - width) : Math.abs(rightCand.leftPct - 100);
            if (leftDist <= rightDist) { showLeftPin = true; pinTarget = leftCand; }
            else { showRightPin = true; pinTarget = rightCand; }
          }
        }
        // Note: we already computed inView and inViewPos above

        // Derive marker unit (top anchors) from span unit
        const spanUnit = tickCfg.unit;
        const markerUnit = (spanUnit === 'month' || spanUnit === 'year') ? 'year'
          : (spanUnit === 'week' || spanUnit === 'day') ? 'month'
          : 'day';
        // Build edge synthetic markers from visible range
        // Use RAW (unpadded) viewport for edge labels so we don't jump to the next unit early
        const [vMin, vMax] = rawVisibleRange;
        // Align edge dates using helpers
        const leftDate = alignToUnitStartUTC(yfToUTCDate(vMin), markerUnit);
        const rightDate = alignToUnitStartUTC(yfToUTCDate(vMax), markerUnit);
        const leftEdge = { yf: utcDateToYearFraction(leftDate), label: formatMarkerLabelUTC(leftDate, markerUnit) };
        const rightEdge = { yf: utcDateToYearFraction(rightDate), label: formatMarkerLabelUTC(rightDate, markerUnit) };
        // If we still have no pin target (e.g., between boundaries with no markers), synthesize from edge labels
        if (!pinTarget && inViewPos.length === 0) {
          // Choose closer boundary to the viewport center in time space
          const centerYf = (vMin + vMax) / 2;
          const dLeft = Math.abs((leftEdge.yf ?? -Infinity) - centerYf);
          const dRight = Math.abs((rightEdge.yf ?? Infinity) - centerYf);
          if (Number.isFinite(dLeft) && Number.isFinite(dRight)) {
            if (dLeft <= dRight) {
              pinTarget = { mk: leftEdge, leftPx: 0, leftPct: 0 };
              showLeftPin = true;
              showRightPin = false;
            } else {
              pinTarget = { mk: rightEdge, leftPx: width, leftPct: 100 };
              showLeftPin = false;
              showRightPin = true;
            }
          } else if (Number.isFinite(dLeft)) {
            pinTarget = { mk: leftEdge, leftPx: 0, leftPct: 0 };
            showLeftPin = true;
          } else if (Number.isFinite(dRight)) {
            pinTarget = { mk: rightEdge, leftPx: width, leftPct: 100 };
            showRightPin = true;
          }
        }

        // Decide whether to show synthetic pins per new rule handled above

        // Render existing in-view markers (suppress near-edge if pin shown)
        const rendered = pos.map((p, i) => {
          if (!inView(p)) return null;
          // Suppress the original if we're pinning it (only applies if it's still barely inside)
          if (pinTarget && p === pinTarget) {
            const dyn = dynamicThresholdFor(p);
            if (showLeftPin && (p.leftPx != null ? p.leftPx <= dyn : p.leftPct <= 0)) return null;
            if (showRightPin && (p.leftPx != null ? p.leftPx >= width - dyn : p.leftPct >= 100)) return null;
          }
          return (
            <div
              key={`mk-${i}-${p.mk.yf}`}
              className={`absolute ${yearsOnTop ? 'top-0' : 'top-6'} text-[11px] text-slate-600 select-none`}
              style={p.leftPx != null ? { left: p.leftPx, transform: 'translateX(-50%)' } : { left: `${p.leftPct}%`, transform: 'translateX(-50%)' }}
            >
              {yearsOnTop ? (
                <>
                  <div className="mb-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'center' }}>{p.mk.label}</div>
                  <div className="w-px h-3 bg-slate-400 mx-auto" style={{ transform: 'translateX(-0.5px)' }} />
                </>
              ) : (
                <>
                  <div className="w-px h-3 bg-slate-400 mx-auto" style={{ transform: 'translateX(-0.5px)' }} />
                  <div className="mt-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'center' }}>{p.mk.label}</div>
                </>
              )}
            </div>
          );
        });

        // Render synthetic left/right pins (only one can be true at a time)
        if (showLeftPin && pinTarget) {
          rendered.push(
            <div
              key={`mk-pin-left-${pinTarget.mk.yf}`}
              className={`absolute ${yearsOnTop ? 'top-0' : 'top-6'} text-[11px] text-slate-600 select-none`}
              style={width > 0 ? { left: 0, transform: 'translateX(0%)' } : { left: '0%', transform: 'translateX(0%)' }}
            >
              {yearsOnTop ? (
                <>
                  <div className="mb-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'left' }}>{pinTarget.mk.label}</div>
                  <div className="w-px h-3 bg-slate-400 mr-auto" />
                </>
              ) : (
                <>
                  <div className="w-px h-3 bg-slate-400 mr-auto" />
                  <div className="mt-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'left' }}>{pinTarget.mk.label}</div>
                </>
              )}
            </div>
          );
        }
        if (showRightPin && pinTarget) {
          rendered.push(
            <div
              key={`mk-pin-right-${pinTarget.mk.yf}`}
              className={`absolute ${yearsOnTop ? 'top-0' : 'top-6'} text-[11px] text-slate-600 select-none`}
              style={width > 0 ? { left: width, transform: 'translateX(-100%)' } : { left: '100%', transform: 'translateX(-100%)' }}
            >
              {yearsOnTop ? (
                <>
                  <div className="mb-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'right' }}>{pinTarget.mk.label}</div>
                  <div className="w-px h-3 bg-slate-400 ml-auto" />
                </>
              ) : (
                <>
                  <div className="w-px h-3 bg-slate-400 ml-auto" />
                  <div className="mt-1 tabular-nums whitespace-nowrap" style={{ textAlign: 'right' }}>{pinTarget.mk.label}</div>
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
          const leftPx = width > 0 ? Math.floor(uScaled * width) : null;
          // strict in-view: [0, width) in pixels, or [0, 100) in percent
          if (leftPx != null) {
            if (leftPx < 0 || leftPx >= width) return null;
          } else {
            if (leftPct < 0 || leftPct >= 100) return null;
          }
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
            <div key={`${it.type}-${it.y}-${it.m || 0}-${it.d || 0}-${it.h || 0}-${it.min || 0}`} className="absolute top-8 select-none" style={leftPx != null ? { left: leftPx, transform: 'translateX(-50%)' } : { left: `${leftPct}%`, transform: 'translateX(-50%)' }}>
              <div className={`w-px ${isMajor ? 'h-3 bg-slate-400' : 'h-2 bg-slate-300/80' } mx-auto`} style={{ transform: 'translateX(-0.5px)' }} />
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
