import React from 'react';
import TypeBadge from '@/components/ui/TypeBadge.jsx';
import CONFIG from '@/config/index.js';

/**
 * Legend for event types using TypeBadge.
 * Props:
 * - layout: 'row' | 'column'
 * - types: optional array of type keys to show (defaults to Object.keys(CONFIG.types))
 * - clickable: if true, items get role/button semantics
 * - onSelect: (type) => void when clickable
 */
export default function TypeLegend({ layout = 'row', types, clickable = false, onSelect, className = '' }) {
  const list = types && types.length ? types : Object.keys(CONFIG.types);
  const base = layout === 'column' ? 'flex flex-col gap-1' : 'flex flex-wrap items-center gap-2';

  return (
    <div className={`${base} ${className}`} aria-label="Type legend">
      {list.map((t) => (
        <button
          key={t}
          type="button"
          className={clickable ? 'cursor-pointer' : 'cursor-default'}
          disabled={!clickable}
          onClick={clickable ? () => onSelect?.(t) : undefined}
          aria-label={clickable ? `Filter by ${t}` : undefined}
        >
          <TypeBadge type={t} />
        </button>
      ))}
    </div>
  );
}
