import { useContext, useMemo } from 'react';
import { TimelineContext } from '../../context/TimelineContext.jsx';
import { buildLinearScaler, buildDecadeMarkers } from '../../utils';

export default function TimelineAxis({ domain = [1990, 2030] }) {
  const { viewport } = useContext(TimelineContext) || { viewport: { scale: 1, pan: 0 } };
  const scale = viewport?.scale ?? 1;
  const pan = viewport?.pan ?? 0; // unit offset (-1..1) applied across width

  const markers = useMemo(() => buildDecadeMarkers(domain, scale), [domain, scale]);
  const scaler = useMemo(() => buildLinearScaler(domain), [domain]);

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
            <div className="mt-1 tabular-nums">{y}</div>
          </div>
        );
      })}
      {scale > 3 && (() => {
        // Month-level ticks at higher zoom
        const [min, max] = domain;
        const yStart = Math.floor(min);
        const yEnd = Math.ceil(max);
        const items = [];
        for (let y = yStart; y <= yEnd; y++) {
          for (let m = 1; m <= 12; m++) {
            const yf = y + (m - 1) / 12;
            if (yf < min || yf > max) continue;
            const u = scaler.toUnit(yf);
            const uScaled = (u - 0.5) * scale + 0.5 + pan;
            const left = Math.max(0, Math.min(100, uScaled * 100));
            items.push({ key: `${y}-${m}`, left, y, m });
          }
        }
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return items.map(({ key, left, m, y }) => (
          <div key={key} className="absolute top-8 select-none" style={{ left: `${left}%`, transform: 'translateX(-50%)' }}>
            <div className={`w-px ${m === 1 ? 'h-3 bg-slate-400' : 'h-2 bg-slate-300/80' } mx-auto`} />
            {scale > 5 && (m === 1 || m === 7) && (
              <div className="mt-1 text-[10px] text-slate-500 tabular-nums">
                {monthNames[m-1]} {m === 1 ? y : ''}
              </div>
            )}
          </div>
        ));
      })()}
    </div>
  );
}
