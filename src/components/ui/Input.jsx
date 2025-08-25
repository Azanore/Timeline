import React from 'react';
import { cn } from '@/lib/utils';

/**
 * @typedef {Object} InputProps
 * @property {string} [id]
 * @property {string} [label]
 * @property {string} [type]
 * @property {string|number} [value]
 * @property {(e: React.ChangeEvent<HTMLInputElement>) => void} [onChange]
 * @property {string} [placeholder]
 * @property {boolean} [required]
 * @property {boolean} [disabled]
 * @property {string} [className]
 * @property {string} [error]
 * @property {string} [helper]
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [maxLength]
 */

/**
 * Tailwind-based input with label and error text.
 * @param {InputProps} props
 */
export default function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  error,
  helper,
  min,
  max,
  maxLength,
  ...rest
}) {
  const inputId = id || React.useId();
  const base = 'w-full rounded-md border bg-background text-foreground px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  const border = error ? 'border-destructive' : 'border-input';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm text-foreground mb-1">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={cn(base, border)}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        maxLength={maxLength}
        {...rest}
      />
      {helper && !error && <p className="text-xs text-muted-foreground mt-1">{helper}</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
