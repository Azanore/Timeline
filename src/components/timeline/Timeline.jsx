import { useContext, useRef, useState, useCallback, useMemo, useEffect } from 'react';
import TimelineAxis from './TimelineAxis.jsx';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { clamp, buildLinearScaler, debounce, clampPan } from '../../utils';
import { useEvents } from '../../hooks/useEvents';
import EventCard from '../events/EventCard.jsx';
import EventDialog from '../events/EventDialog.jsx';
import Tooltip from '../ui/Tooltip.jsx';

export default function Timeline({ domain }) {
  const containerRef = useRef(null);
  const { viewport, setPan, setScale } = useContext(TimelineContext) || { viewport: { scale: 1, pan: 0 } };
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startPan: 0 });
  const touchState = useRef({
    mode: 'none', // 'none' | 'pan' | 'pinch'
    startX: 0,
    startPan: 0,
    startDist: 0,
    startScale: 1,
  });
  const { events, clusters, stacks } = useEvents();
  const scaler = useMemo(() => buildLinearScaler(domain), [domain]);
  const [openEdit, setOpenEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [liveMsg, setLiveMsg] = useState('');
  const [overflowOpenKey, setOverflowOpenKey] = useState(null);
  const [isVertical, setIsVertical] = useState(false);

  // Responsive orientation: vertical on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsVertical(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
    };
  }, []);

  // Type filters
  const availableTypes = useMemo(() => Array.from(new Set((events || []).map(e => e.type || 'other'))), [events]);
  const [typeFilter, setTypeFilter] = useState({});
  useEffect(() => {
    // ensure all types exist in filter; default to true (shown)
    setTypeFilter(prev => {
      const next = { ...prev };
      availableTypes.forEach(t => { if (typeof next[t] === 'undefined') next[t] = true; });
      // remove stale keys
      Object.keys(next).forEach(k => { if (!availableTypes.includes(k)) delete next[k]; });
      return next;
    });
  }, [availableTypes]);
  const toggleType = useCallback((t) => setTypeFilter(prev => ({ ...prev, [t]: !prev[t] })), []);

  // Debounced viewport updates
  const debouncedSetPan = useMemo(() => debounce((v) => setPan(v), 16), [setPan]);
  const debouncedSetScale = useMemo(() => debounce((v) => setScale(v), 16), [setScale]);

  // Update aria-live message on viewport changes
  useEffect(() => {
    const s = (viewport?.scale ?? 1).toFixed(2);
    const p = Math.round(((viewport?.pan ?? 0) + 0) * 100);
    setLiveMsg(`Zoom ${s}x, Pan ${p}%`);
  }, [viewport?.scale, viewport?.pan]);

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
    debouncedSetPan(nextPan);
  }, [dragging, setPan, viewport?.scale]);

  const endDrag = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e) => {
    if (!containerRef.current) return;
    const current = viewport?.scale ?? 1;
    // Zoom factor; trackpad-friendly small increments
    const delta = -e.deltaY; // invert: wheel up -> zoom in
    const factor = 1 + clamp(delta / 1000, -0.25, 0.25);
    const next = clamp(current * factor, 0.1, 5);
    debouncedSetScale(next);
  }, [viewport?.scale, debouncedSetScale]);

  // Touch handlers
  const getDistance = (t1, t2) => {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = useCallback((e) => {
    if (!containerRef.current) return;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchState.current.mode = 'pan';
      touchState.current.startX = t.clientX;
      touchState.current.startPan = viewport?.pan ?? 0;
    } else if (e.touches.length >= 2) {
      const d = getDistance(e.touches[0], e.touches[1]);
      touchState.current.mode = 'pinch';
      touchState.current.startDist = d || 1;
      touchState.current.startScale = viewport?.scale ?? 1;
    }
  }, [viewport?.pan, viewport?.scale]);

  const onTouchMove = useCallback((e) => {
    if (!containerRef.current) return;
    if (touchState.current.mode === 'pan' && e.touches.length === 1) {
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.touches[0].clientX - touchState.current.startX;
      const unitDelta = dx / rect.width;
      debouncedSetPan(clampPan(touchState.current.startPan + unitDelta, viewport?.scale ?? 1));
    } else if (touchState.current.mode === 'pinch' && e.touches.length >= 2) {
      const d = getDistance(e.touches[0], e.touches[1]) || 1;
      const factor = d / (touchState.current.startDist || 1);
      const next = clamp(touchState.current.startScale * factor, 0.1, 5);
      debouncedSetScale(next);
    }
  }, [debouncedSetPan, debouncedSetScale, viewport?.scale]);

  const onTouchEnd = useCallback(() => {
    touchState.current.mode = 'none';
  }, []);

  // Keyboard accessibility: arrows to pan, +/- to zoom, 0/Home to reset
  const onKeyDown = useCallback((e) => {
    const key = e.key;
    const stepPan = 0.05;
    const factorIn = 1.1;
    const factorOut = 1 / factorIn;
    if (key === 'ArrowLeft') {
      e.preventDefault();
      debouncedSetPan(clampPan((viewport?.pan ?? 0) - stepPan, viewport?.scale ?? 1));
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      debouncedSetPan(clampPan((viewport?.pan ?? 0) + stepPan, viewport?.scale ?? 1));
    } else if (key === '+' || key === '=') {
      e.preventDefault();
      debouncedSetScale(clamp((viewport?.scale ?? 1) * factorIn, 0.1, 5));
    } else if (key === '-' || key === '_') {
      e.preventDefault();
      debouncedSetScale(clamp((viewport?.scale ?? 1) * factorOut, 0.1, 5));
    } else if (key === '0' || key === 'Home') {
      e.preventDefault();
      debouncedSetPan(0);
      debouncedSetScale(1);
    }
  }, [viewport?.pan, viewport?.scale, debouncedSetPan, debouncedSetScale]);

  return (
    <div className="w-full">
      <div aria-live="polite" className="sr-only">{liveMsg}</div>
      <TimelineAxis domain={domain} />
      <div
        ref={containerRef}
        className={`h-64 border border-slate-200 rounded-md bg-white/60 ${dragging ? 'cursor-grabbing' : 'cursor-grab'} select-none touch-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
        tabIndex={0}
        role="region"
        aria-label="Timeline track"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="relative w-full h-full" role="list" aria-label="Timeline events">
          {(() => {
            const pan = viewport?.pan ?? 0;
            const typeToColor = {
              history: { key: 'rose', dot: 'bg-rose-600', border: 'rose' },
              personal: { key: 'emerald', dot: 'bg-emerald-600', border: 'emerald' },
              science: { key: 'blue', dot: 'bg-blue-600', border: 'blue' },
              culture: { key: 'violet', dot: 'bg-violet-600', border: 'violet' },
              tech: { key: 'amber', dot: 'bg-amber-500', border: 'amber' },
              other: { key: 'slate', dot: 'bg-slate-600', border: 'slate' },
            };
            // Helper to convert partial date to fractional year
            const toYearFraction = (d = {}) => {
              const y = Number(d.year);
              if (!Number.isFinite(y)) return null;
              const m = Number(d.month || 0);
              const day = Number(d.day || 0);
              const hr = Number(d.hour || 0);
              const min = Number(d.minute || 0);
              // rough fractional conversion: month (0..11), day (0..30), hour/min (0..24/60)
              const monthFrac = m > 0 ? (m - 1) / 12 : 0;
              const dayFrac = day > 0 ? (day - 1) / 365 : 0;
              const timeFrac = (hr / 24 + min / (24 * 60)) / 365;
              return y + monthFrac + dayFrac + timeFrac;
            };

            // Build render items from clusters using stacks for side/level
            const groups = clusters.map(({ key, items }) => {
              const assign = new Map((stacks.get(key) || []).map(a => [a.id, a]));
              const first = items[0];
              const yf = toYearFraction(first.start);
              if (yf == null) return null;
              const u = scaler.toUnit(yf);
              const uScaled = (u - 0.5) * (viewport?.scale ?? 1) + 0.5 + pan;
              const posPct = Math.max(0, Math.min(100, uScaled * 100));

              const rendered = items.map((e) => {
                const a = assign.get(e.id) || { side: 'above', level: 0 };
                const colorKey = typeToColor[e.type]?.key || 'slate';
                const dotClass = typeToColor[e.type]?.dot || 'bg-slate-600';
                const type = e.type || 'other';
                const active = typeFilter[type] !== false; // default true
                const yfEnd = e.end ? toYearFraction(e.end) : null;
                let endLeft = null;
                if (yfEnd != null) {
                  const ue = scaler.toUnit(yfEnd);
                  const ueScaled = (ue - 0.5) * (viewport?.scale ?? 1) + 0.5 + pan;
                  endLeft = Math.max(0, Math.min(100, ueScaled * 100));
                }
                return { e, yf, posPct, endLeft, color: colorKey, dotClass, active, side: a.side, level: a.level };
              });
              return { key, posPct, items: rendered };
            }).filter(Boolean);

            // Position rows around center using side/level
            const center = isVertical
              ? (containerRef.current?.clientWidth || 600) / 2
              : (containerRef.current?.clientHeight || 256) / 2;
            const levelGap = 30; // px between levels (perpendicular to axis)
            const stackOffset = (side, level) => {
              const offset = (level + 1) * levelGap;
              return side === 'above' ? center - offset : center + (level * levelGap) + 10;
            };

            const renderGroup = (group) => {
              const { posPct, items } = group;
              const over = Math.max(0, items.length - 8);
              const visible = items.slice(0, 8);
              return (
                <div key={`grp-${group.key}-${posPct.toFixed(2)}`} className="absolute" style={isVertical ? { top: `${posPct}%` } : { left: `${posPct}%` }}>
                  {visible.map(({ e, yf, endLeft, color, dotClass, active, side, level }) => (
                    <div key={e.id || `${e.title}-${yf}-${side}-${level}`} className={`absolute ${active ? '' : 'opacity-40'}`} style={isVertical ? { left: stackOffset(side, level) } : { top: stackOffset(side, level) }} role="listitem">
                      {/* Duration span (if any) */}
                      {Number.isFinite(endLeft) && (
                        <div
                          className="absolute h-0.5 rounded"
                          style={{
                            ...(isVertical
                              ? { top: '6px', height: '2px', left: `${Math.min(posPct, endLeft)}%`, width: `${Math.abs((endLeft ?? posPct) - posPct)}%` }
                              : { left: `${Math.min(posPct, endLeft)}%`, width: `${Math.abs((endLeft ?? posPct) - posPct)}%`, top: '6px' }
                            ),
                            top: '6px',
                            backgroundColor: dotClass.includes('rose') ? '#e11d48' : dotClass.includes('emerald') ? '#059669' : dotClass.includes('blue') ? '#2563eb' : dotClass.includes('violet') ? '#7c3aed' : dotClass.includes('amber') ? '#f59e0b' : '#334155',
                          }}
                        />
                      )}
                      <div className={isVertical ? '-translate-y-1/2 relative' : '-translate-x-1/2 relative'}>
                        <Tooltip label={`${e.title} (${e.start?.year || ''})`}>
                          <button
                            type="button"
                            className={`w-2 h-2 rounded-full shadow mx-auto ${dotClass}`}
                            aria-label={`${e.title} (${e.start?.year || ''})`}
                            onClick={() => { setSelected(e); setOpenEdit(true); }}
                          />
                        </Tooltip>
                        <div className="mt-1" onClick={() => { setSelected(e); setOpenEdit(true); }}>
                          <Tooltip label={`${e.title} (${e.start?.year || ''})`}>
                            <div>
                              <EventCard title={e.title} year={e.start?.year} color={color} />
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
                  {over > 0 && (
                    <div className="absolute" style={isVertical ? { left: stackOffset('below', 3) + 24 } : { top: stackOffset('below', 3) + 24 }}>
                      <Tooltip label={items.slice(8).map(it => it.e.title).join('\n')}>
                        <button
                          type="button"
                          className="-translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded-full border border-slate-300 bg-white text-slate-600 shadow"
                          aria-expanded={overflowOpenKey === group.key}
                          aria-controls={`overflow-${group.key}`}
                          aria-label={`+${over} more events`}
                          onClick={() => setOverflowOpenKey(k => (k === group.key ? null : group.key))}
                        >
                          +{over}
                        </button>
                      </Tooltip>
                      {overflowOpenKey === group.key && (
                        <div
                          id={`overflow-${group.key}`}
                          className="absolute left-2 top-6 -translate-x-1/2 z-10 w-52 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
                          role="dialog"
                          aria-label="More events"
                        >
                          <ul className="divide-y divide-slate-100">
                            {items.slice(8).map(({ e }) => (
                              <li key={e.id} className="p-2 hover:bg-slate-50 cursor-pointer" onClick={() => { setSelected(e); setOpenEdit(true); }}>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block w-2 h-2 rounded-full ${typeToColor[e.type]?.dot || 'bg-slate-600'}`} />
                                  <span className="text-xs text-slate-700 truncate">{e.title}</span>
                                  <span className="ml-auto text-[10px] text-slate-500">{e.start?.year}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            };
            return groups.map(renderGroup);
          })()}
        </div>
      </div>
      {events.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
          {(() => {
            const types = availableTypes;
            const legend = {
              history: { label: 'History', dot: 'bg-rose-600' },
              personal: { label: 'Personal', dot: 'bg-emerald-600' },
              science: { label: 'Science', dot: 'bg-blue-600' },
              culture: { label: 'Culture', dot: 'bg-violet-600' },
              tech: { label: 'Tech', dot: 'bg-amber-500' },
              other: { label: 'Other', dot: 'bg-slate-600' },
            };
            return (
              <>
                {types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${typeFilter[t] !== false ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 opacity-60'}`}
                    aria-pressed={typeFilter[t] !== false}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${legend[t]?.dot || 'bg-slate-600'}`} />
                    <span>{legend[t]?.label || 'Other'}</span>
                  </button>
                ))}
              </>
            );
          })()}
        </div>
      )}
      <EventDialog open={openEdit} onClose={() => setOpenEdit(false)} event={selected} />
    </div>
  );
}
