import { useContext, useRef, useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import ZoomControls from './ZoomControls.jsx';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { clamp, buildLinearScaler, clampPan, toYearFraction, getAdaptiveScaleBounds } from '../../utils';
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
export default function Timeline({ domain }) {
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

  // Track container width for responsive layout recomputation
  const [containerWidth, setContainerWidth] = useState(0);

  // Lanes by type removed; events always stack relative to center

  // Orientation responsiveness removed: always horizontal

  // Use direct setters from context for viewport updates

  // Update aria-live message on viewport changes
  useEffect(() => {
    const s = (viewport?.scale ?? 1).toFixed(2);
    const p = Math.round(((viewport?.pan ?? 0) + 0) * 100);
    setLiveMsg(`Zoom ${s}x, Pan ${p}%`);
  }, [viewport?.scale, viewport?.pan]);

  // Observe container width changes to recompute rows responsively
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      try {
        const rect = el.getBoundingClientRect();
        const w = Math.max(0, Math.round(rect.width));
        setContainerWidth(w);
      } catch {}
    };
    measure();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
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
    const bounds = getAdaptiveScaleBounds(domain);
    const Snext = clamp(S * factor, bounds.min, bounds.max);
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
      // Zoom only when Ctrl/Cmd is pressed; plain wheel does not zoom
      if (evt.ctrlKey || evt.metaKey) {
        evt.preventDefault();
        onWheel(evt);
      }
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
    // Depend on onWheel so logic stays up to date
  }, [onWheel]);

  // Colors/types now sourced from CONFIG.types; toYearFraction from utils

  // Absolute/columns modes removed; rows is the only display mode

  // Build rows (collision-based) for rows-only mode
  const rowsData = useMemo(() => {
    const width = containerWidth || 800;
    const scaleVal = viewport?.scale ?? 1;
    const panVal = viewport?.pan ?? 0;
    // Tiered heights to keep layout predictable (for body visibility only)
    const tier = scaleVal >= 1.5 ? 'max' : scaleVal >= 0.8 ? 'mid' : 'min';
    const CARD_W = 160; // fixed card width including border (border-box)
    const TOTAL_W = CARD_W; // border included via global border-box
    // Tiny epsilon so touching doesn't oscillate due to float error while panning
    const EPS = 0.25;

    // Compute uScaled for all events (based on current pan/scale) from raw events
    const all = sortedEvents.map((e, idx) => {
      const yf = toYearFraction(e.start);
      if (yf == null) return null;
      const u = scaler.toUnit(yf);
      const uScaled = (u - 0.5) * scaleVal + 0.5 + panVal;
      return { e, rawU: u, uScaled };
    }).filter(Boolean);

    // Sort by raw position for stable left-to-right packing
    all.sort((a, b) => (a.rawU || 0) - (b.rawU || 0));

    /** @type {{end:number, items:Array<{it:any, x:number}>}[]} */
    const rows = [];
    for (const it of all) {
      const centerX = it.uScaled * width;
      let x = centerX - TOTAL_W / 2;
      // place into first row where no true overlap; touching is allowed
      let r = rows.findIndex(rw => (rw.end <= x - EPS));
      if (r === -1) {
        rows.push({ end: -Infinity, items: [] });
        r = rows.length - 1;
      }
      rows[r].items.push({ it, x });
      rows[r].end = x + TOTAL_W; // update last end for collision
    }
    return { rows, tier };
  }, [sortedEvents, viewport?.scale, viewport?.pan, scaler, containerWidth]);

  return (
    <div className="w-full h-full flex flex-col">
      <div aria-live="polite" className="sr-only">{liveMsg}</div>
      <div
        ref={containerRef}
        className={`h-64 overflow-y-auto overflow-x-hidden no-scrollbar border border-border rounded-md bg-background/60 ${dragging ? 'cursor-grabbing' : 'cursor-grab'} select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
        {/* Rows-only mode: auto-height rows via grid overlap; cards positioned with translateX */}
        <div className="relative w-full min-h-full space-y-1 py-1" role="list" aria-label="Timeline events (row mode)">
          {rowsData?.rows?.map((row, rIdx) => (
            <div
              key={`row-${rIdx}`}
              className={`grid relative w-full border-y ${rIdx % 2 === 0 ? 'bg-muted border-border' : 'bg-background border-border'}`}
              role="list"
              aria-label={`Row ${rIdx + 1}`}
            >
              {row.items.map(({ it, x }) => {
                const { e } = it;
                const scaleVal = viewport?.scale ?? 1;
                const showBody = scaleVal >= 1.5; // hide at small scale like column mode
                return (
                  <div key={`it-${e.id}`} className="col-start-1 row-start-1" style={{ transform: `translateX(${x}px)`, width: '160px' }} role="listitem">
                    <EventCard
                      event={e}
                      scale={scaleVal}
                      selected={selected?.id === e.id}
                      onClick={() => { setSelected(e); setOpenEdit(true); }}
                      fullWidth
                      forceFull
                      showBody={showBody}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
      </div>
      <ZoomControls />
      <EventDialog open={openEdit} onClose={() => setOpenEdit(false)} event={selected} closeOnSave />
    </div>
  );
}
