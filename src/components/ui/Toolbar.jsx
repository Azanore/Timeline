import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Floating/inline toolbar surface for control clusters.
 */
export default function Toolbar({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 bg-white/80 backdrop-blur rounded-md shadow border border-input px-3 py-2',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
