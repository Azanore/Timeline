import { useMemo } from 'react';
import { formatPartialUTC } from '../../utils';
import CONFIG from '../../config/index.js';
import TypeBadge from '@/components/ui/TypeBadge.jsx';

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
export default function EventCard({ event, scale, selected = false, onClick, fullWidth = false, forceFull = false, showBody = true }) {
  const tier = scale >= 1.5 ? 'max' : scale >= 0.8 ? 'mid' : 'min';

  const borderColorClass = useMemo(() => {
    const key = CONFIG.types[event?.type || 'other']?.border || 'slate';
    // Map type key to Tailwind border color classes
    const map = {
      rose: 'border-rose-400',
      emerald: 'border-emerald-400',
      blue: 'border-blue-400',
      violet: 'border-violet-400',
      amber: 'border-amber-400',
      slate: 'border-border',
    };
    return map[key] || 'border-border';
  }, [event?.type]);

  // Background tint: use per-type theme-aware tint with light/dark support
  const bgTintClass = useMemo(() => {
    return CONFIG.types[event?.type || 'other']?.bgTint || 'bg-muted';
  }, [event?.type]);

  const dateText = useMemo(() => {
    const s = event?.start ? formatPartialUTC(event.start) : '';
    const e = event?.end ? formatPartialUTC(event.end) : '';
    return e ? `${s} → ${e}` : s;
  }, [event]);

  // Sizing: if fullWidth, span the full column; otherwise keep tier-based sizing
  const sizeClasses = fullWidth
    ? 'block w-full'
    : (tier === 'min' ? 'inline-flex max-w-none' : 'block max-w-[140px]');

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${event?.title || 'Event'}${dateText ? ` (${dateText})` : ''}`}
      className={[
        'group text-left border-l border-r border-y-0',
        'px-2 py-1.5',
        sizeClasses,
        'max-h-[140px] overflow-hidden',
        'backdrop-blur-sm',
        bgTintClass,
        borderColorClass,
        selected ? 'ring-2 ring-offset-2 ring-primary' : '',
        'transition-shadow',
      ].join(' ')}
      title={tier === 'min' ? event?.title : `${event?.title || ''}${dateText ? ' • ' + dateText : ''}`}
    >
      <div className="flex items-start">
        <div className="min-w-0">
          <div className={`flex items-center gap-1 ${forceFull ? 'truncate' : (tier === 'min' ? 'whitespace-nowrap' : 'truncate')}`}>
            {(forceFull || tier !== 'min') && (
              <TypeBadge type={event?.type || 'other'} className="shrink-0" />
            )}
            <span className="text-[11px] font-medium text-foreground truncate">{event?.title || ''}</span>
          </div>
          {(forceFull || tier !== 'min') && (
            <div className="text-[10px] text-muted-foreground truncate">{dateText}</div>
          )}
          {(showBody && (forceFull || tier === 'max') && event?.body) && (
            <p
              className="mt-1 text-[10px] text-foreground/80 whitespace-pre-wrap break-words"
              style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
            >
              {event.body}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
