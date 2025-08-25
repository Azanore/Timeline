import { useContext, useMemo, useEffect, useCallback } from 'react';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { snapScale, clampPan, getAdaptiveScaleBounds } from '../../utils';
import { useTimeline } from '../../hooks/useTimeline';
import CONFIG from '../../config/index.js';
import Toolbar from '@/components/ui/Toolbar.jsx';
import Button from '@/components/ui/Button.jsx';

export default function ZoomControls() {
  const ctx = useContext(TimelineContext);
  const scale = ctx?.viewport?.scale ?? 1;
  const pan = ctx?.viewport?.pan ?? 0;
  const setScale = ctx?.setScale ?? (() => {});
  const setPan = ctx?.setPan ?? (() => {});
  const { domain } = useTimeline();

  const pretty = useMemo(() => Math.round(scale * 100) / 100, [scale]);

  const clampScale = (v) => {
    const b = getAdaptiveScaleBounds(domain);
    return Math.min(b.max, Math.max(b.min, v));
  };

  const onKey = useCallback((e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
    if (e.key === '+') {
      e.preventDefault();
      const next = snapScale(clampScale(scale + CONFIG.zoom.step));
      setScale(next);
      const clampedPan = clampPan(pan, next);
      if (clampedPan !== pan) setPan(clampedPan);
    }
    if (e.key === '=') {
      e.preventDefault();
      const next = snapScale(clampScale(scale + CONFIG.zoom.step));
      setScale(next);
      const clampedPan = clampPan(pan, next);
      if (clampedPan !== pan) setPan(clampedPan);
    }
    if (e.key === '-') {
      e.preventDefault();
      const next = snapScale(clampScale(scale - CONFIG.zoom.step));
      setScale(next);
      const clampedPan = clampPan(pan, next);
      if (clampedPan !== pan) setPan(clampedPan);
    }
    if (e.key === '0') {
      e.preventDefault();
      const b = getAdaptiveScaleBounds(domain);
      const next = Math.min(Math.max(CONFIG.zoom.reset, b.min), b.max);
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
    <Toolbar className="fixed bottom-6 left-6">
      <Button
        variant="outline"
        size="sm"
        aria-label="Zoom out" title="Zoom out"
        className="px-2 py-1"
        onClick={() => { const next = snapScale(clampScale(scale - CONFIG.zoom.step)); setScale(next); const p2 = clampPan(pan, next); if (p2 !== pan) setPan(p2); }}
      >-</Button>
      <span className="text-sm tabular-nums min-w-[56px] text-center">{pretty}x</span>
      <Button
        variant="outline"
        size="sm"
        aria-label="Zoom in" title="Zoom in"
        className="px-2 py-1"
        onClick={() => { const next = snapScale(clampScale(scale + CONFIG.zoom.step)); setScale(next); const p2 = clampPan(pan, next); if (p2 !== pan) setPan(p2); }}
      >+</Button>
      <Button
        variant="outline"
        size="sm"
        className="ml-2 px-2 py-1"
        aria-label="Reset zoom" title="Reset zoom"
        onClick={() => { const b = getAdaptiveScaleBounds(domain); const next = Math.min(Math.max(CONFIG.zoom.reset, b.min), b.max); setScale(next); const p2 = clampPan(pan, next); if (p2 !== pan) setPan(p2); }}
      >Reset</Button>
    </Toolbar>
  );
}
