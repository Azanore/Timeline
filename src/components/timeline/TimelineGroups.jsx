import React from 'react';
import Tooltip from '../ui/Tooltip.jsx';
import EventCard from '../events/EventCard.jsx';

/**
 * @typedef {Object} TimelineGroupsProps
 * @property {Array<{ key: string, posPct: number, items: Array<{ e: any, yf: number, endLeft: number|null, color: string, dotClass: string, active: boolean, side: 'above'|'below', level: number }>}>} groups
 * @property {boolean} isVertical
 * @property {(side: 'above'|'below', level: number) => number} stackOffset
 * @property {string|null} overflowOpenKey
 * @property {(updater: (k: string|null) => string|null) => void} setOverflowOpenKey
 * @property {(e: any) => void} onSelect
 * @property {(open: boolean) => void} setOpenEdit
 * @property {Record<string, { label?: string, dot?: string }>} typeLegend
 */

/**
 * Renders timeline groups and their items.
 * @param {TimelineGroupsProps} props
 */
function TimelineGroups({
  groups,
  isVertical,
  stackOffset,
  overflowOpenKey,
  setOverflowOpenKey,
  onSelect,
  setOpenEdit,
  typeLegend,
}) {
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
                  onClick={() => { onSelect(e); setOpenEdit(true); }}
                />
              </Tooltip>
              <div className="mt-1" onClick={() => { onSelect(e); setOpenEdit(true); }}>
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
                    <li key={e.id} className="p-2 hover:bg-slate-50 cursor-pointer" onClick={() => { onSelect(e); setOpenEdit(true); }}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${typeLegend[e.type]?.dot || 'bg-slate-600'}`} />
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

  return (
    <>{groups.map(renderGroup)}</>
  );
}

export default React.memo(TimelineGroups);
