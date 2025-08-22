import { useMemo } from 'react';
import { formatPartialUTC, typeLegend } from '../../utils';

/**
 * @typedef {Object} EventCardProps
 * @property {{ id:string, title:string, body?:string, type?:string, start:any, end?:any }} event
 * @property {number} scale
 * @property {boolean} [selected]
 * @property {() => void} [onClick]
 */

/**
 * Adaptive event card displayed on the timeline instead of a small dot.
 * Content density adjusts with zoom scale.
 */
export default function EventCard({ event, scale, selected = false, onClick }) {
  const tier = scale >= 1.5 ? 'max' : scale >= 0.8 ? 'mid' : 'min';

  const borderColorClass = useMemo(() => {
    const key = typeLegend[event?.type || 'other']?.border || 'slate';
    // Map type key to Tailwind border color classes
    const map = {
      rose: 'border-rose-400',
      emerald: 'border-emerald-400',
      blue: 'border-blue-400',
      violet: 'border-violet-400',
      amber: 'border-amber-400',
      slate: 'border-slate-300',
    };
    return map[key] || 'border-slate-300';
  }, [event?.type]);

  const dotBgClass = useMemo(() => {
    return typeLegend[event?.type || 'other']?.dot || 'bg-slate-600';
  }, [event?.type]);

  const dateText = useMemo(() => {
    const s = event?.start ? formatPartialUTC(event.start) : '';
    const e = event?.end ? formatPartialUTC(event.end) : '';
    return e ? `${s} → ${e}` : s;
  }, [event]);

  // Tier-specific sizing
  const sizeClasses = tier === 'min'
    ? 'inline-flex max-w-none' // content-sized width when only title is shown
    : 'block max-w-[160px]'; // smaller max width than before for mid/max tiers

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${event?.title || 'Event'}${dateText ? ` (${dateText})` : ''}`}
      className={[
        'group text-left bg-white/95 border rounded-md shadow-sm',
        'px-2 py-1.5',
        sizeClasses,
        'max-h-[140px] overflow-hidden',
        'backdrop-blur-sm',
        borderColorClass,
        selected ? 'ring-2 ring-offset-2 ring-emerald-500' : '',
        'transition-shadow',
      ].join(' ')}
      title={tier === 'min' ? event?.title : `${event?.title || ''}${dateText ? ' • ' + dateText : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${dotBgClass}`} />
        <div className="min-w-0">
          <div className={`text-[11px] font-medium text-slate-800 ${tier === 'min' ? 'whitespace-nowrap' : 'truncate'}`}>{event?.title || ''}</div>
          {tier !== 'min' && (
            <div className="text-[10px] text-slate-500 truncate">{dateText}</div>
          )}
          {tier === 'max' && event?.body && (
            <p
              className="mt-1 text-[10px] text-slate-700 whitespace-pre-wrap break-words"
              style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}
            >
              {event.body}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
