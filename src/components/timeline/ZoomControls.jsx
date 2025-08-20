import { useContext, useMemo } from 'react';
import { TimelineContext } from '../../context/TimelineContext.jsx';

export default function ZoomControls() {
  const ctx = useContext(TimelineContext);
  const scale = ctx?.viewport?.scale ?? 1;
  const setScale = ctx?.setScale ?? (() => {});

  const pretty = useMemo(() => Math.round(scale * 100) / 100, [scale]);

  const clamp = (v) => Math.min(5, Math.max(0.1, v));

  return (
    <div className="fixed bottom-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur rounded shadow px-3 py-2">
      <button className="px-2 py-1 border rounded text-sm" aria-label="Zoom out" title="Zoom out" onClick={() => setScale(clamp(scale - 0.1))}>-</button>
      <span className="text-sm tabular-nums min-w-[56px] text-center">{pretty}x</span>
      <button className="px-2 py-1 border rounded text-sm" aria-label="Zoom in" title="Zoom in" onClick={() => setScale(clamp(scale + 0.1))}>+</button>
      <button className="ml-2 px-2 py-1 border rounded text-sm" aria-label="Reset zoom" title="Reset zoom" onClick={() => setScale(1)}>Reset</button>
    </div>
  );
}
