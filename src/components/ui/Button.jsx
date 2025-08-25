import React from 'react';
import { cn } from '@/lib/utils';

/**
 * @typedef {Object} ButtonProps
 * @property {'solid'|'outline'|'ghost'} [variant]
 * @property {'sm'|'md'|'lg'} [size]
 * @property {string} [className]
 * @property {boolean} [disabled]
 * @property {React.ButtonHTMLAttributes<HTMLButtonElement>['type']} [type]
 * @property {React.ReactNode} children
 * @property {() => void} [onClick]
 */

/**
 * Simple Tailwind-based button.
 * @param {ButtonProps} props
 */
export default function Button({
  variant = 'solid',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  children,
  onClick,
  ...rest
}) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  }[size];
  const variants = {
    solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
    ghost: 'bg-transparent text-foreground hover:bg-accent',
  }[variant];

  return (
    <button
      type={type}
      className={cn(base, sizes, variants, className)}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
