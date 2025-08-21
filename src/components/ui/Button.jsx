import React from 'react';

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
  const base = 'inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size];
  const variants = {
    solid: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100',
  }[variant];

  return (
    <button
      type={type}
      className={`${base} ${sizes} ${variants} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
