import React from 'react';
import { cn } from '@/lib/utils';

/**
 * @typedef {Object} TextareaProps
 * @property {string} [className]
 * @property {boolean} [disabled]
 * @property {string} [id]
 * @property {string|number} [value]
 * @property {(e: React.ChangeEvent<HTMLTextAreaElement>) => void} [onChange]
 * @property {string} [placeholder]
 * @property {number} [rows]
 * @property {boolean} [error]
 */

/**
 * Tokenized textarea aligned with shadcn styles.
 * @param {TextareaProps} props
 */
export default function Textarea({
  className = '',
  disabled = false,
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  error = false,
  ...rest
}) {
  const base = 'w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const border = error ? 'border-destructive' : 'border-input';

  return (
    <textarea
      id={id}
      className={cn(base, border, className)}
      disabled={disabled}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      {...rest}
    />
  );
}
