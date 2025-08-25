import React from 'react';
import Badge from '@/components/ui/Badge.jsx';
import CONFIG from '@/config/index.js';

/**
 * Renders a type chip with a colored dot and label based on CONFIG.types
 */
export default function TypeBadge({ type = 'other', className = '' }) {
  const color = CONFIG.types[type]?.dot || 'bg-slate-600';
  return (
    <Badge variant="outline" className={className}>
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="capitalize">{type}</span>
    </Badge>
  );
}
