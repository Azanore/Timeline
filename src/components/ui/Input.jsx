import React from 'react';

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
  const base = 'w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const border = error ? 'border-rose-400' : 'border-slate-300';

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm text-slate-700 mb-1">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`${base} ${border}`}
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
      {helper && !error && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
