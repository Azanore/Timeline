import React from 'react';
import { cn } from '@/lib/utils';
import * as RToolbar from '@radix-ui/react-toolbar';

/**
 * Floating/inline toolbar surface for control clusters.
 */
export default function Toolbar({ className = '', children, ...props }) {
  return (
    <RToolbar.Root
      className={cn(
        'flex items-center gap-2 bg-background/80 backdrop-blur rounded-md shadow border border-input px-3 py-2 text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </RToolbar.Root>
  );
}
