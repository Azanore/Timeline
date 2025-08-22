import { useContext, useRef, useState, useCallback, useMemo, useEffect, Fragment } from 'react';
import TimelineAxis from './TimelineAxis.jsx';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { clamp, buildLinearScaler, clampPan, toYearFraction, snapScale, clusterByPosition } from '../../utils';
import CONFIG from '../../config/index.js';
import { useEvents } from '../../hooks/useEvents';
import EventDialog from '../events/EventDialog.jsx';
import EventCard from '../events/EventCard.jsx';

/**
 * @typedef {Object} TimelineProps
 * @property {[number, number]} domain - Inclusive time domain [minYear, maxYear]
 */

/**
 * Timeline container: orchestrates axis, events, and interactions.
 * @param {TimelineProps} props
 */
export default function Timeline({ domain, lanesByType = false }) {
  const containerRef = useRef(null);
  const { viewport, setPan, setScale } = useContext(TimelineContext) || { viewport: { scale: 1, pan: 0 } };
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startPan: 0 });
  const rafRef = useRef(null);
  const pendingPanRef = useRef(null);
  const { sortedEvents } = useEvents();
  const scaler = useMemo(() => buildLinearScaler(domain), [domain]);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [liveMsg, setLiveMsg] = useState('');
  const isVertical = false; // Force horizontal layout only

  // Build stable lane order by type
  const typeOrder = useMemo(() => {
    const map = new Map();
    (sortedEvents || []).forEach((e) => {
      const t = e?.type || 'other';
      if (!map.has(t)) map.set(t, map.size);
    });
    return map;
  }, [sortedEvents]);

  // Orientation responsiveness removed: always horizontal

  // Use direct setters from context for viewport updates

  // Update aria-live message on viewport changes
  useEffect(() => {
    const s = (viewport?.scale ?? 1).toFixed(2);
    const p = Math.round(((viewport?.pan ?? 0) + 0) * 100);
    setLiveMsg(`Zoom ${s}x, Pan ${p}%`);
  }, [viewport?.scale, viewport?.pan]);

  // Auto-scroll into view: center the selected event by adjusting pan
  useEffect(() => {
    if (!selected) return;
    const yf = toYearFraction(selected.start);
    if (yf == null) return;
    const u = scaler.toUnit(yf);
    const S = Math.max(0.1, viewport?.scale ?? 1);
    if (S <= 1) {
      // No panning necessary when content fits
      return;
    }
    const bound = (S - 1) / (2 * S);
    // To center u at 0.5 after scaling, solve: 0.5 = (u - 0.5)*S + 0.5 + P => P = - (u - 0.5)*S
    const desired = - (u - 0.5) * S;
    const clamped = Math.max(-bound, Math.min(bound, desired));
    // Only update if pan meaningfully changes to avoid loops
    if (Math.abs((viewport?.pan ?? 0) - clamped) > 1e-4) {
      setPan(clamped);
    }
  }, [selected?.id]);

  const onMouseDown = useCallback((e) => {
    if (!containerRef.current) return;
    setDragging(true);
    dragState.current.startX = e.clientX;
    dragState.current.startPan = viewport?.pan ?? 0;
  }, [viewport?.pan]);

  const onMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragState.current.startX;
    const unitDelta = dx / rect.width; // convert px to unit [0..1]
    const nextPan = clampPan(dragState.current.startPan + unitDelta, viewport?.scale ?? 1);
    pendingPanRef.current = nextPan;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingPanRef.current != null) setPan(pendingPanRef.current);
        rafRef.current = null;
      });
    }
  }, [dragging, setPan, viewport?.scale]);

  const endDrag = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1); // anchor point 0..1
    const S = viewport?.scale ?? 1;
    const P = viewport?.pan ?? 0;
    // Zoom factor; trackpad-friendly small increments
    const delta = -e.deltaY; // invert: wheel up -> zoom in
    const factor = 1 + clamp(delta / 1000, -CONFIG.zoom.wheelDeltaClampPer1000, CONFIG.zoom.wheelDeltaClampPer1000);
    // Important: do not snap on wheel, or we get stuck at 0.5 with tiny deltas
    const Snext = clamp(S * factor, CONFIG.zoom.scaleMin, CONFIG.zoom.scaleMax);
    // Keep the point under cursor stationary after zoom
    // Derived from uScaled = (u - 0.5)*S + 0.5 + P, with u = x kept fixed on screen
    const ratio = S === 0 ? 1 : (Snext / S);
    let Pnext = (x - 0.5) - (x - 0.5 - P) * ratio;
    Pnext = clampPan(Pnext, Snext);
    // rAF throttle scale+pan updates
    if (!rafRef.current) {
      const ns = Snext; const np = Pnext;
      rafRef.current = requestAnimationFrame(() => {
        setScale(ns);
        setPan(np);
        rafRef.current = null;
      });
    } else {
      setScale(Snext);
      setPan(Pnext);
    }
  }, [viewport?.scale, viewport?.pan, setScale, setPan]);

  // Attach a non-passive wheel listener so preventDefault works without warnings
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handle = (evt) => {
      // Prevent page scroll while zooming timeline
      evt.preventDefault();
      onWheel(evt);
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
    // Depend on onWheel so logic stays up to date
  }, [onWheel]);

  // Colors/types now sourced from CONFIG.types; toYearFraction from utils

  // Prepare flat list of positioned items with virtualization and (low-zoom) clustering
  const items = useMemo(() => {
    const pan = viewport?.pan ?? 0;
    const scale = viewport?.scale ?? 1;
    const buffer = CONFIG.timeline.virtualBuffer; // outside viewport buffer
    const raw = (sortedEvents || []).map((e, idx) => {
      const yf = toYearFraction(e.start);
      if (yf == null) return null;
      const outStart = yf < domain[0] || yf > domain[1];
      const u = scaler.toUnit(yf);
      const uScaled = (u - 0.5) * scale + 0.5 + pan;
      if (uScaled < -buffer || uScaled > 1 + buffer) return null; // virtualization window
      const posPct = Math.max(0, Math.min(100, uScaled * 100));
      const yfEnd = e.end ? toYearFraction(e.end) : null;
      let endPos = null;
      let outEnd = false;
      if (yfEnd != null) {
        outEnd = yfEnd < domain[0] || yfEnd > domain[1];
        const ue = scaler.toUnit(yfEnd);
        const ueScaled = (ue - 0.5) * scale + 0.5 + pan;
        endPos = Math.max(0, Math.min(100, ueScaled * 100));
      }
      const side = idx % 2 === 0 ? 'above' : 'below';
      const level = idx % 4;
      const colorKey = CONFIG.types[e.type]?.key || 'slate';
      const dotClass = CONFIG.types[e.type]?.dot || 'bg-slate-600';
      const outOfDomain = outStart || outEnd;
      const laneIndex = typeOrder.get(e?.type || 'other') || 0;
      return { e, uScaled, posPct, endPos, color: colorKey, dotClass, side, level, outOfDomain, laneIndex };
    }).filter(Boolean);

    // At low zoom, cluster dense points to reduce overdraw
    if (scale < CONFIG.clustering.lowZoomThreshold && raw.length > CONFIG.clustering.clusterMinItems) {
      const clusters = clusterByPosition(
        raw.map(it => ({ key: it.e.id, uScaled: it.uScaled, data: it })),
        CONFIG.clustering.bucketSize,
        { edgePad: CONFIG.clustering.edgePad }
      );
      const merged = [];
      for (const c of clusters) {
        if (c.count >= 4) {
          const centerU = clamp(c.bucket, 0, 1);
          const posPct = centerU * 100;
          merged.push({ cluster: true, count: c.count, uScaled: centerU, posPct });
        } else {
          for (const it of c.items) merged.push(it.data);
        }
      }
      return merged;
    }
    // Same-time stacking with overflow within tiny buckets
    const epsilon = CONFIG.events.samePosEpsilonPct; // percent gap to consider same position
    const maxPerGroup = CONFIG.events.maxPerGroup;
    const byPos = [];
    const sorted = [...raw].sort((a, b) => a.posPct - b.posPct);
    let i = 0;
    while (i < sorted.length) {
      const start = sorted[i].posPct;
      const group = [];
      while (i < sorted.length && Math.abs(sorted[i].posPct - start) <= epsilon) {
        group.push(sorted[i]);
        i++;
      }
      // assign levels cyclically
      group.forEach((it, idx) => { it.level = idx % 4; });
      if (group.length > maxPerGroup) {
        const visible = group.slice(0, maxPerGroup);
        const hiddenCount = group.length - maxPerGroup;
        byPos.push(...visible);
        byPos.push({ overflow: true, count: hiddenCount, posPct: start, uScaled: visible[0].uScaled });
      } else {
        byPos.push(...group);
      }
    }
    return byPos;
  }, [sortedEvents, scaler, viewport?.scale, viewport?.pan, typeOrder]);

  // Memoized center offset function
  const stackOffset = useCallback((side, level) => {
    const center = isVertical
      ? (containerRef.current?.clientWidth || 600) / 2
      : (containerRef.current?.clientHeight || 256) / 2;
    const levelGap = CONFIG.display.levelGap;
    const offset = (level + 1) * levelGap;
    return side === 'above' ? center - offset : center + (level * levelGap) + CONFIG.display.extraOffsetPx;
  }, [isVertical]);

  const laneCenter = useCallback((laneIndex) => {
    const isV = isVertical;
    const extent = isV ? (containerRef.current?.clientWidth || 600) : (containerRef.current?.clientHeight || 256);
    const laneCount = Math.max(1, typeOrder.size || 1);
    if (laneCount <= 1) return Math.floor(extent / 2);
    const margin = CONFIG.display.laneMarginPx;
    const usable = Math.max(0, extent - margin * 2);
    const gap = laneCount > 1 ? (usable / (laneCount - 1)) : 0;
    return Math.round(margin + Math.min(laneIndex, laneCount - 1) * gap);
  }, [isVertical, typeOrder]);

  return (
    <div className="w-full h-full flex flex-col">
      <div aria-live="polite" className="sr-only">{liveMsg}</div>
      <TimelineAxis domain={domain} />
      <div
        ref={containerRef}
        className={`flex-1 min-h-64 border border-slate-200 rounded-md bg-white/60 ${dragging ? 'cursor-grabbing' : 'cursor-grab'} select-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden`}
        tabIndex={0}
        role="region"
        aria-label="Timeline track"
        onKeyDown={(e) => {
          const scale = viewport?.scale ?? 1;
          let p = viewport?.pan ?? 0;
          const step = 0.02;
          // Keyboard panning
          if (e.key === 'ArrowLeft' || (isVertical && e.key === 'ArrowUp')) { p = clampPan(p - step, scale); setPan(p); e.preventDefault(); }
          if (e.key === 'ArrowRight' || (isVertical && e.key === 'ArrowDown')) { p = clampPan(p + step, scale); setPan(p); e.preventDefault(); }
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        <div className="relative w-full h-full" role="list" aria-label="Timeline events">
          {items.map((it, idx) => {
            if (it.cluster) {
              const posStyle = isVertical ? { top: `${it.posPct}%`, left: (containerRef.current?.clientWidth || 600) / 2 } : { left: `${it.posPct}%`, top: (containerRef.current?.clientHeight || 256) / 2 };
              return (
                <div key={`cluster-${idx}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={posStyle}>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full text-xs bg-slate-800 text-white shadow"
                    title={`${it.count} events`}
                    onClick={() => {
                      // Zoom in and center on cluster
                      const next = snapScale((viewport?.scale ?? 1) * 1.5);
                      setScale(next);
                      const centerU = clamp(it.uScaled, 0, 1);
                      const currentScale = next;
                      const bound = (currentScale - 1) / (2 * currentScale);
                      // Centering formula derived from uScaled = (u - 0.5) * S + 0.5 + P => P = - (u - 0.5) * S
                      const desiredPan = clamp(-(centerU - 0.5) * currentScale, -bound, bound);
                      setPan(desiredPan);
                    }}
                  >
                    +{it.count}
                  </button>
                </div>
              );
            }
            if (it.overflow) {
              const posStyle = isVertical ? { top: `${it.posPct}%`, left: (containerRef.current?.clientWidth || 600) / 2 } : { left: `${it.posPct}%`, top: (containerRef.current?.clientHeight || 256) / 2 };
              return (
                <div key={`overflow-${idx}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={posStyle}>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-xs text-slate-700 shadow">+{it.count}</span>
                </div>
              );
            }
            const { e, posPct, endPos, dotClass, side, level, outOfDomain, laneIndex } = it;
            const scaleVal = viewport?.scale ?? 1;
            // Edge-aware alignment to avoid clipping near boundaries
            const innerTransform = (() => {
              if (isVertical) {
                if (posPct < 1) return 'translate(-50%, 0)';
                if (posPct > 99) return 'translate(-50%, -100%)';
                return 'translate(-50%, -50%)';
              } else {
                if (posPct < 1) return 'translateX(0)';
                if (posPct > 99) return 'translateX(-100%)';
                return 'translateX(-50%)';
              }
            })();
            // Compute end-dot inner transform similarly
            const endInnerTransform = (() => {
              if (!Number.isFinite(endPos)) return 'translate(-50%, -50%)';
              if (isVertical) {
                if (endPos < 1) return 'translateY(0)';
                if (endPos > 99) return 'translateY(-100%)';
                return 'translateY(-50%)';
              } else {
                if (endPos < 1) return 'translateX(0)';
                if (endPos > 99) return 'translateX(-100%)';
                return 'translateX(-50%)';
              }
            })();
            return (
              <Fragment key={`it-${e.id}`}>
                <div key={e.id} className={`absolute ${selected?.id === e.id ? 'z-20' : ''} ${outOfDomain ? 'opacity-60' : ''}`} style={
                  isVertical
                    ? { top: `${posPct}%`, left: lanesByType ? laneCenter(laneIndex) : stackOffset(side, level) }
                    : { left: `${posPct}%`, top: lanesByType ? laneCenter(laneIndex) : stackOffset(side, level) }
                } role="listitem">
              {/* Duration span (if any) - Adaptive rendering by zoom */}
              {Number.isFinite(endPos) && scaleVal >= 1.5 && (
                <div
                  className="absolute rounded"
                  style={{
                    ...(isVertical
                      ? {
                          top: `${Math.min(posPct, endPos)}%`,
                          height: `${Math.abs((endPos ?? posPct) - posPct)}%`,
                          left: `${lanesByType ? laneCenter(laneIndex) : stackOffset(side, level)}px`,
                          width: '3px',
                          minHeight: '3px',
                        }
                      : {
                          left: `${Math.min(posPct, endPos)}%`,
                          width: `${Math.max(3, Math.abs((endPos ?? posPct) - posPct))}%`,
                          top: '5px',
                          height: '3px',
                          minWidth: '3px',
                        }
                    ),
                    backgroundColor: dotClass.includes('rose') ? '#e11d48' : dotClass.includes('emerald') ? '#059669' : dotClass.includes('blue') ? '#2563eb' : dotClass.includes('violet') ? '#7c3aed' : dotClass.includes('amber') ? '#f59e0b' : '#334155',
                  }}
                />
              )}
              {/* Mid zoom: thin duration bars */}
              {Number.isFinite(endPos) && scaleVal >= 0.8 && scaleVal < 1.5 && (
                <div
                  className="absolute rounded"
                  style={{
                    ...(isVertical
                      ? {
                          top: `${Math.min(posPct, endPos)}%`,
                          height: `${Math.abs((endPos ?? posPct) - posPct)}%`,
                          left: `${lanesByType ? laneCenter(laneIndex) : stackOffset(side, level)}px`,
                          width: '2px',
                          minHeight: '2px',
                        }
                      : {
                          left: `${Math.min(posPct, endPos)}%`,
                          width: `${Math.max(2, Math.abs((endPos ?? posPct) - posPct))}%`,
                          top: '6px',
                          height: '2px',
                          minWidth: '2px',
                        }
                    ),
                    backgroundColor: dotClass.includes('rose') ? '#e11d48' : dotClass.includes('emerald') ? '#059669' : dotClass.includes('blue') ? '#2563eb' : dotClass.includes('violet') ? '#7c3aed' : dotClass.includes('amber') ? '#f59e0b' : '#334155',
                  }}
                />
              )}
              {/* Far zoom: faint connectors */}
              {Number.isFinite(endPos) && scaleVal < 0.8 && (
                <div
                  className="absolute opacity-30"
                  style={{
                    ...(isVertical
                      ? {
                          top: `${Math.min(posPct, endPos)}%`,
                          height: `${Math.max(1, Math.abs((endPos ?? posPct) - posPct))}%`,
                          left: `${lanesByType ? laneCenter(laneIndex) : stackOffset(side, level)}px`,
                          width: '1px',
                          minHeight: '1px',
                        }
                      : {
                          left: `${Math.min(posPct, endPos)}%`,
                          width: `${Math.max(1, Math.abs((endPos ?? posPct) - posPct))}%`,
                          top: '7px',
                          height: '1px',
                          minWidth: '1px',
                        }
                    ),
                    backgroundColor: '#94a3b8',
                  }}
                />
              )}
              <div className="relative" style={{ transform: innerTransform }}>
                <EventCard
                  event={e}
                  scale={scaleVal}
                  selected={selected?.id === e.id}
                  onClick={() => { setSelected(e); setOpenEdit(true); }}
                />
              </div>
                </div>
                {/* Far zoom: render an end dot as well (two dots + connector) */}
                {Number.isFinite(endPos) && scaleVal < 0.8 && (
                  <div key={`${e.id}-end`} className={`absolute ${selected?.id === e.id ? 'z-20' : ''} ${outOfDomain ? 'opacity-60' : ''}`} style={
                    isVertical
                      ? { top: `${endPos}%`, left: lanesByType ? laneCenter(laneIndex) : stackOffset(side, level) }
                      : { left: `${endPos}%`, top: lanesByType ? laneCenter(laneIndex) : stackOffset(side, level) }
                  }>
                    <div className="relative" style={{ transform: endInnerTransform }}>
                      <button
                        type="button"
                        className={`${scaleVal >= 1.5 ? 'w-3 h-3' : scaleVal >= 0.8 ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full shadow mx-auto ${dotClass} ${selected?.id === e.id ? 'ring-2 ring-offset-2 ring-emerald-500' : ''} ${outOfDomain ? 'opacity-60 outline outline-1 outline-slate-400' : ''}`}
                        aria-label={`${e.title} end (${e.end?.year || ''})${outOfDomain ? ' (out of domain)' : ''}`}
                        onClick={() => { setSelected(e); setOpenEdit(true); }}
                        title={`${e.title} end (${e.end?.year || ''})${outOfDomain ? ' • out of domain' : ''}`}
                      />
                    </div>
                  </div>
                )}
              </Fragment>
            );})}
        </div>
      </div>
      <EventDialog open={openEdit} onClose={() => setOpenEdit(false)} event={selected} closeOnSave />
    </div>
  );
}
