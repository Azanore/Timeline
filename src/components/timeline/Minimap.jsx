import { useMemo, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { TimelineContext } from '@/context/TimelineContext.jsx';
import { toYearFraction, buildLinearScaler, clampPan, getAdaptiveScaleBounds } from '@/utils';
import CONFIG from '@/config/index.js';

/**
 * Minimap: compact overview of the entire timeline with current viewport window.
 * Read-only (click to center) version.
 *
 * props:
 * - domain: [minYear, maxYear]
 * - events: array of dated events (already filtered/sorted upstream)
 */
export default function Minimap({ domain, events = [] }) {
  const { viewport, setPan, setScale } = useContext(TimelineContext) || { viewport: { scale: 1, pan: 0 } };
  const scaler = useMemo(() => buildLinearScaler(domain), [domain]);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragMode, setDragMode] = useState('none'); // 'none' | 'window' | 'resizeLeft' | 'resizeRight' | 'brush'
  const dragState = useRef({ startX: 0, startLeft: 0, startRight: 0, win: 1 });
  const didDragRef = useRef(false);
  const moveHandlerRef = useRef(null);
  const upHandlerRef = useRef(null);
  const [brush, setBrush] = useState(null); // {a:number,b:number} in unit space [0..1]

  // Precompute unit positions [0..1] for markers
  const markers = useMemo(() => {
    return (events || [])
      .map((e) => {
        const yf = toYearFraction(e.start);
        if (yf == null) return null;
        const u = scaler.toUnit(yf);
        if (!isFinite(u)) return null;
        return { id: e.id, u, type: e.type };
      })
      .filter(Boolean);
  }, [events, scaler]);

  const scale = viewport?.scale ?? 1;
  const pan = viewport?.pan ?? 0;

  // Compute viewport window in unit space using the same mapping as the main timeline:
  // s = (u - 0.5) * S + 0.5 + P. Visible u-range solves s in [0,1].
  // u_left = 0.5 - (0.5 + P) / S, width = 1 / S
  const win = Math.min(1, 1 / Math.max(scale, 1e-6));
  let left = 0.5 - (0.5 + pan) / Math.max(scale, 1e-6);
  if (win >= 1) {
    left = 0;
  } else {
    left = Math.max(0, Math.min(1 - win, left));
  }

  const onClick = useCallback(
    (e) => {
      // Ignore click if a drag just happened
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const desiredPan = -(x - 0.5) * (viewport?.scale ?? 1);
      const next = clampPan(desiredPan, viewport?.scale ?? 1);
      setPan(next);
    },
    [setPan, viewport?.scale]
  );

  const onMouseDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const HANDLE_PX = 8;
    const hUnit = Math.max(0.001, HANDLE_PX / Math.max(rect.width, 1));
    const right = left + win;

    // Determine interaction mode
    let mode = 'brush';
    if (x >= left && x <= right) {
      if (x <= left + hUnit) mode = 'resizeLeft';
      else if (x >= right - hUnit) mode = 'resizeRight';
      else mode = 'window';
    }

    dragState.current.startX = x;
    dragState.current.startLeft = left;
    dragState.current.startRight = right;
    dragState.current.win = win;
    didDragRef.current = false;
    setDragMode(mode);
    setDragging(true);
    if (mode === 'brush') setBrush({ a: x, b: x });

    const bounds = getAdaptiveScaleBounds(domain);

    const handleMove = (ev) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (!r) return;
      const cx = (ev.clientX - r.left) / r.width; // 0..1
      const dx = cx - dragState.current.startX;
      if (Math.abs(dx) > 0.002) didDragRef.current = true; // threshold to suppress click

      if (mode === 'window') {
        const nextLeft = Math.max(0, Math.min(1 - dragState.current.win, dragState.current.startLeft + dx));
        const S = viewport?.scale ?? 1;
        const desiredPan = S * (0.5 - nextLeft) - 0.5;
        const nextPan = clampPan(desiredPan, S);
        setPan(nextPan);
      } else if (mode === 'resizeLeft') {
        const rightEdge = dragState.current.startRight; // fixed during left resize start
        let newLeft = Math.max(0, Math.min(rightEdge, dragState.current.startLeft + dx));
        let newWin = Math.max(1 / bounds.max, Math.min(1, rightEdge - newLeft));
        // Recompute left if clamped by min/max
        newLeft = Math.min(rightEdge - newWin, Math.max(0, newLeft));
        const Snext = Math.max(bounds.min, Math.min(bounds.max, 1 / Math.max(newWin, 1e-6)));
        const winNext = 1 / Snext;
        const leftNext = Math.min(rightEdge - winNext, Math.max(0, newLeft));
        const Pnext = Snext * (0.5 - leftNext) - 0.5;
        setScale(Snext);
        setPan(clampPan(Pnext, Snext));
      } else if (mode === 'resizeRight') {
        const leftEdge = dragState.current.startLeft;
        let newRight = Math.max(leftEdge, Math.min(1, dragState.current.startRight + dx));
        let newWin = Math.max(1 / bounds.max, Math.min(1, newRight - leftEdge));
        const Snext = Math.max(bounds.min, Math.min(bounds.max, 1 / Math.max(newWin, 1e-6)));
        const winNext = 1 / Snext;
        // Keep left fixed; recompute right from left + winNext
        const leftNext = Math.max(0, Math.min(1 - winNext, leftEdge));
        const Pnext = Snext * (0.5 - leftNext) - 0.5;
        setScale(Snext);
        setPan(clampPan(Pnext, Snext));
      } else if (mode === 'brush') {
        setBrush((b) => (b ? { a: b.a, b: cx } : { a: cx, b: cx }));
      }
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', moveHandlerRef.current, true);
      window.removeEventListener('mouseup', upHandlerRef.current, true);
      moveHandlerRef.current = null;
      upHandlerRef.current = null;

      if (dragMode === 'brush' && brush) {
        const a = Math.max(0, Math.min(1, brush.a));
        const b = Math.max(0, Math.min(1, brush.b));
        const leftSel = Math.min(a, b);
        const rightSel = Math.max(a, b);
        const width = Math.max(0, rightSel - leftSel);
        const bounds = getAdaptiveScaleBounds(domain);
        if (width < 0.01) {
          // Tiny brush: treat as center at midpoint
          const center = (a + b) / 2;
          const S = viewport?.scale ?? 1;
          const P = clampPan(-(center - 0.5) * S, S);
          setPan(P);
        } else {
          let Snext = 1 / width;
          Snext = Math.max(bounds.min, Math.min(bounds.max, Snext));
          const winNext = 1 / Snext;
          const center = (leftSel + rightSel) / 2;
          let leftNext = center - winNext / 2;
          leftNext = Math.max(0, Math.min(1 - winNext, leftNext));
          const Pnext = Snext * (0.5 - leftNext) - 0.5;
          setScale(Snext);
          setPan(clampPan(Pnext, Snext));
        }
      }
      setBrush(null);
      setDragging(false);
      setDragMode('none');
    };
    moveHandlerRef.current = handleMove;
    upHandlerRef.current = handleUp;
    window.addEventListener('mousemove', handleMove, true);
    window.addEventListener('mouseup', handleUp, true);
  }, [left, win, setPan, setScale, viewport?.scale, domain, dragMode, brush]);

  // Cleanup in case component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (moveHandlerRef.current) window.removeEventListener('mousemove', moveHandlerRef.current, true);
      if (upHandlerRef.current) window.removeEventListener('mouseup', upHandlerRef.current, true);
    };
  }, []);

  // Zoom with wheel on minimap (no modifier required for convenience)
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const S = viewport?.scale ?? 1;
    const delta = -e.deltaY; // up -> zoom in
    const factor = 1 + Math.max(-CONFIG.zoom.wheelDeltaClampPer1000, Math.min(CONFIG.zoom.wheelDeltaClampPer1000, delta / 1000));
    const bounds = getAdaptiveScaleBounds(domain);
    const Snext = Math.max(bounds.min, Math.min(bounds.max, S * factor));
    const ratio = S === 0 ? 1 : (Snext / S);
    // keep x centered as much as possible
    const P = viewport?.pan ?? 0;
    let Pnext = (x - 0.5) - (x - 0.5 - P) * ratio;
    Pnext = clampPan(Pnext, Snext);
    setScale(Snext);
    setPan(Pnext);
  }, [setScale, setPan, viewport?.scale, viewport?.pan, domain]);

  return (
    <div
      className="mt-2 select-none"
      role="region"
      aria-label="Timeline minimap"
    >
      <div
        ref={containerRef}
        className={`relative h-12 w-full overflow-hidden rounded border border-border bg-muted/40 ${dragging ? 'cursor-grabbing' : dragMode==='brush' ? 'cursor-crosshair' : 'cursor-pointer'}`}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
      >
        {/* Event markers */}
        <div className="absolute inset-0">
          {markers.map((m) => (
            <div
              key={m.id}
              className="absolute top-0 h-full w-px bg-foreground/30"
              style={{ left: `${m.u * 100}%` }}
              aria-hidden="true"
            />
          ))}
        </div>
        {/* Viewport window */}
        <div
          className="absolute top-0 h-full rounded-sm border border-primary/70 bg-primary/10"
          style={{ left: `${left * 100}%`, width: `${win * 100}%` }}
          aria-label="Current viewport"
        >
          {/* Resize handles */}
          <div
            className="absolute top-0 left-0 h-full w-2 bg-primary/20 border-r border-primary/60 cursor-ew-resize"
            aria-hidden="true"
          />
          <div
            className="absolute top-0 right-0 h-full w-2 bg-primary/20 border-l border-primary/60 cursor-ew-resize"
            aria-hidden="true"
          />
        </div>

        {/* Brush selection overlay */}
        {brush && (
          <div
            className="absolute top-0 h-full bg-foreground/10 border-x border-foreground/40"
            style={{ left: `${Math.min(brush.a, brush.b) * 100}%`, width: `${Math.abs(brush.b - brush.a) * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
