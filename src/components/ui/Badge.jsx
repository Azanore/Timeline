import React from 'react';
import { cn } from '@/lib/utils';

export default function Badge({ className = '', children, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-accent text-accent-foreground',
    outline: 'border border-input bg-transparent text-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
