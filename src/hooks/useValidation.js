// Placeholder validation hook with stable callbacks.
import { useCallback } from 'react';
import { comparePartialDate } from '../utils';

// Helpers at module scope
const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
const daysInMonth = (y, m) => [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] || 31;
const stripInvisible = (s = '') => String(s).replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF\u00A0]/g, '').trim();

const isValidDatePartsFn = (d = {}) => {
  const hasVal = (v) => v !== undefined && v !== null && v !== '';
  const y = Number(d.year);
  if (!Number.isFinite(y) || y < 1900 || y > 2100) return false;
  if (hasVal(d.month)) {
    const m = Number(d.month);
    if (!Number.isFinite(m) || m < 1 || m > 12) return false;
    if (hasVal(d.day)) {
      const day = Number(d.day);
      if (!Number.isFinite(day) || day < 1 || day > daysInMonth(y, m)) return false;
    }
  }
  if (hasVal(d.hour)) {
    const h = Number(d.hour);
    if (!Number.isFinite(h) || h < 0 || h > 23) return false;
  }
  if (hasVal(d.minute)) {
    const min = Number(d.minute);
    if (!Number.isFinite(min) || min < 0 || min > 59) return false;
  }
  return true;
};

const validateEventFn = (e) => {
  const errors = {};
  const rawTitle = e?.title || '';
  const title = stripInvisible(rawTitle);
  if (title.length === 0) errors.title = 'Required';
  if (rawTitle.length > 100) errors.title = 'Max 100 chars';
  const rawBody = e?.body ?? '';
  const body = stripInvisible(rawBody);
  if (body.length === 0) errors.body = 'Required';
  else if (rawBody.length > 500) errors.body = 'Max 500 chars';

  // Start date validation
  if (!isValidDatePartsFn(e?.start)) errors.start = 'Invalid start date/time';

  // End date validation (optional)
  if (e?.end) {
    if (!isValidDatePartsFn(e.end)) errors.end = 'Invalid end date/time';
    // Ensure end is not before start if both valid (numeric comparison)
    try {
      const a = e.start || {};
      const b = e.end || {};
      if (comparePartialDate(b, a) < 0) errors.range = 'End must be after start';
    } catch {}
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export function useValidation() {
  const validateEvent = useCallback(validateEventFn, []);
  const isValidDateParts = useCallback(isValidDatePartsFn, []);
  return { validateEvent, isValidDateParts };
}
