// Placeholder validation hook.
import { comparePartialDate } from '../utils';
export function useValidation() {
  const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const daysInMonth = (y, m) => [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] || 31;

  const isValidDateParts = (d = {}) => {
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

  const validateEvent = (e) => {
    const errors = {};
    const title = e?.title || '';
    if (title.trim().length === 0) errors.title = 'Required';
    if (title.length > 100) errors.title = 'Max 100 chars';
    if (e?.body && e.body.length > 500) errors.body = 'Max 500 chars';

    // Start date validation
    if (!isValidDateParts(e?.start)) errors.start = 'Invalid start date/time';

    // End date validation (optional)
    if (e?.end) {
      if (!isValidDateParts(e.end)) errors.end = 'Invalid end date/time';
      // Ensure end is not before start if both valid (numeric comparison)
      try {
        const a = e.start || {};
        const b = e.end || {};
        if (comparePartialDate(b, a) < 0) errors.range = 'End must be after start';
      } catch {}
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  return { validateEvent, isValidDateParts };
}
