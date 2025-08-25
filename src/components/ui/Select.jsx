import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Simple tokenized Select that mirrors Input/Textarea styles.
 */
export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={cn(
        'w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm',
        'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'border-input',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
