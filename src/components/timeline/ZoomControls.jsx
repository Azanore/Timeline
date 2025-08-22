import { useContext, useMemo, useEffect, useCallback } from 'react';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { snapScale, clampPan } from '../../utils';
import CONFIG from '../../config/index.js';

export default function ZoomControls() {
  const ctx = useContext(TimelineContext);
  const scale = ctx?.viewport?.scale ?? 1;
  const pan = ctx?.viewport?.pan ?? 0;
  const setScale = ctx?.setScale ?? (() => {});
  const setPan = ctx?.setPan ?? (() => {});

  const pretty = useMemo(() => Math.round(scale * 100) / 100, [scale]);

  const clamp = (v) => Math.min(CONFIG.zoom.scaleMax, Math.max(CONFIG.zoom.scaleMin, v));

  const onKey = useCallback((e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    if (e.key === '+') {
      e.preventDefault();
      const next = snapScale(clamp(scale + CONFIG.zoom.step));
      setScale(next);
      const clampedPan = clampPan(pan, next);
      if (clampedPan !== pan) setPan(clampedPan);
    }
    if (e.key === '=') {
      e.preventDefault();
      const next = snapScale(clamp(scale + CONFIG.zoom.step));
      setScale(next);
      const clampedPan = clampPan(pan, next);
      if (clampedPan !== pan) setPan(clampedPan);
    }
    if (e.key === '-') {
      e.preventDefault();
      const next = snapScale(clamp(scale - CONFIG.zoom.step));
      setScale(next);
      const clampedPan = clampPan(pan, next);
      if (clampedPan !== pan) setPan(clampedPan);
    }
    if (e.key === '0') {
      e.preventDefault();
      const next = CONFIG.zoom.reset;
      setScale(next);
      const clampedPan = clampPan(pan, next);
      if (clampedPan !== pan) setPan(clampedPan);
    }
  }, [scale, pan, setScale, setPan]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  return (
    <div className="fixed bottom-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur rounded shadow px-3 py-2">
      <button
        className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Zoom out" title="Zoom out"
        onClick={() => { const next = snapScale(clamp(scale - CONFIG.zoom.step)); setScale(next); const p2 = clampPan(pan, next); if (p2 !== pan) setPan(p2); }}
      >-</button>
      <span className="text-sm tabular-nums min-w-[56px] text-center">{pretty}x</span>
      <button
        className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Zoom in" title="Zoom in"
        onClick={() => { const next = snapScale(clamp(scale + CONFIG.zoom.step)); setScale(next); const p2 = clampPan(pan, next); if (p2 !== pan) setPan(p2); }}
      >+</button>
      <button
        className="ml-2 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Reset zoom" title="Reset zoom"
        onClick={() => { const next = CONFIG.zoom.reset; setScale(next); const p2 = clampPan(pan, next); if (p2 !== pan) setPan(p2); }}
      >Reset</button>
    </div>
  );
}
