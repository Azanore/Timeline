import React from 'react';
import Badge from '@/components/ui/Badge.jsx';
import { cn } from '@/lib/utils';
import CONFIG from '@/config/index.js';

/**
 * Renders a type chip with a colored dot and label based on CONFIG.types
 */
export default function TypeBadge({ type = 'other', className = '', showLabel = true }) {
  const cfg = CONFIG.types[type] || {};
  const color = cfg.dot || 'bg-muted-foreground';
  const badgeBg = cfg.badge || 'bg-muted/50 border-border';
  if (!showLabel) {
    // Dot-only: render a pure circle without padded badge wrapper to keep it perfectly round
    return <span aria-hidden className={cn('inline-block w-2 h-2 rounded-full', color, className)} />;
  }

  return (
    <Badge variant="outline" className={cn('inline-flex items-center gap-1.5', badgeBg, className)}>
      <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="capitalize">{type}</span>
    </Badge>
  );
}
