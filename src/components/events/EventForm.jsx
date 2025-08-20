import { useState, useEffect } from 'react';
import { sanitizeText } from '../../utils';
import { useValidation } from '../../hooks/useValidation';

/**
 * @typedef EventInput
 * @property {string} title
 * @property {string} [body]
 * @property {'history'|'personal'|'science'|'culture'|'tech'|'other'} type
 * @property {{year:number, month?:number, day?:number, hour?:number, minute?:number}} start
 */

export default function EventForm({ value, onChange, onValidityChange, onCancel, onSubmit, labels = { submitLabel: 'Save', cancelLabel: 'Cancel' } }) {
  const { validateEvent } = useValidation();
  const [local, setLocal] = useState(() => ({
    title: value?.title || '',
    body: value?.body || '',
    type: value?.type || 'other',
    start: {
      year: value?.start?.year || 2000,
      month: value?.start?.month || '',
      day: value?.start?.day || '',
      hour: value?.start?.hour || '',
      minute: value?.start?.minute || '',
    },
    end: value?.end ? {
      year: value?.end?.year || '',
      month: value?.end?.month || '',
      day: value?.end?.day || '',
      hour: value?.end?.hour || '',
      minute: value?.end?.minute || '',
    } : null,
  }));
  const [errors, setErrors] = useState({});
  const [endEnabled, setEndEnabled] = useState(!!value?.end);

  useEffect(() => {
    const draft = { ...local, end: endEnabled ? local.end : null };
    onChange?.(draft);
    const { valid, errors: errs } = validateEvent({ ...draft, title: local.title });
    setErrors(errs);
    onValidityChange?.(valid);
    // Intentionally depend only on local/endEnabled to avoid loops from changing function refs
    // validateEvent and callbacks are assumed stable enough for this form's lifecycle
  }, [local, endEnabled]);

  const update = (patch) => setLocal(prev => ({ ...prev, ...patch }));
  const updateStart = (patch) => setLocal(prev => ({ ...prev, start: { ...prev.start, ...patch } }));
  const updateEnd = (patch) => setLocal(prev => ({ ...prev, end: { ...(prev.end || {}), ...patch } }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const draft = { ...local, end: endEnabled ? local.end : null };
        const { valid } = validateEvent(draft);
        if (!valid) return;
        const cleaned = {
          ...draft,
          title: sanitizeText(draft.title),
          body: sanitizeText(draft.body),
          start: {
            year: Number(draft.start.year),
            month: draft.start.month ? Number(draft.start.month) : undefined,
            day: draft.start.day ? Number(draft.start.day) : undefined,
            hour: draft.start.hour ? Number(draft.start.hour) : undefined,
            minute: draft.start.minute ? Number(draft.start.minute) : undefined,
          },
          end: endEnabled && draft.end ? {
            year: Number(draft.end.year),
            month: draft.end.month ? Number(draft.end.month) : undefined,
            day: draft.end.day ? Number(draft.end.day) : undefined,
            hour: draft.end.hour ? Number(draft.end.hour) : undefined,
            minute: draft.end.minute ? Number(draft.end.minute) : undefined,
          } : undefined,
        };
        onSubmit?.(cleaned);
      }}
    >
      <div>
        <label className="block text-sm text-slate-700 mb-1">Title</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          value={local.title}
          maxLength={100}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Event title"
          required
        />
        {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Year</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={local.start.year}
            onChange={(e) => updateStart({ year: Number(e.target.value) })}
            min={1900}
            max={2100}
            placeholder="YYYY"
            required
          />
          {errors.start && <p className="text-xs text-rose-600 mt-1">{errors.start}</p>}
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Type</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={local.type}
            onChange={(e) => update({ type: e.target.value })}
          >
            <option value="history">History</option>
            <option value="personal">Personal</option>
            <option value="science">Science</option>
            <option value="culture">Culture</option>
            <option value="tech">Tech</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-sm text-slate-700 mb-1">Month</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={local.start.month}
            onChange={(e) => updateStart({ month: e.target.value ? Number(e.target.value) : '' })}
            min={1}
            max={12}
            placeholder="MM"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Day</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={local.start.day}
            onChange={(e) => updateStart({ day: e.target.value ? Number(e.target.value) : '' })}
            min={1}
            max={31}
            placeholder="DD"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Hour</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={local.start.hour}
            onChange={(e) => updateStart({ hour: e.target.value ? Number(e.target.value) : '' })}
            min={0}
            max={23}
            placeholder="HH"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">Minute</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={local.start.minute}
            onChange={(e) => updateStart({ minute: e.target.value ? Number(e.target.value) : '' })}
            min={0}
            max={59}
            placeholder="MM"
          />
        </div>
      </div>

      <div className="pt-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={endEnabled} onChange={(e) => setEndEnabled(e.target.checked)} />
          Period (has end date)
        </label>
      </div>

      {endEnabled && (
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-sm text-slate-700 mb-1">End Year</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={local.end?.year || ''}
              onChange={(e) => updateEnd({ year: e.target.value ? Number(e.target.value) : '' })}
              min={1900}
              max={2100}
              placeholder="YYYY"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Month</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={local.end?.month || ''}
              onChange={(e) => updateEnd({ month: e.target.value ? Number(e.target.value) : '' })}
              min={1}
              max={12}
              placeholder="MM"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Day</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={local.end?.day || ''}
              onChange={(e) => updateEnd({ day: e.target.value ? Number(e.target.value) : '' })}
              min={1}
              max={31}
              placeholder="DD"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Hour</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={local.end?.hour || ''}
              onChange={(e) => updateEnd({ hour: e.target.value ? Number(e.target.value) : '' })}
              min={0}
              max={23}
              placeholder="HH"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Minute</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={local.end?.minute || ''}
              onChange={(e) => updateEnd({ minute: e.target.value ? Number(e.target.value) : '' })}
              min={0}
              max={59}
              placeholder="MM"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="px-3 py-1.5 text-sm rounded border" onClick={onCancel}>{labels.cancelLabel}</button>
        <button type="submit" className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-all duration-300">{labels.submitLabel}</button>
      </div>
    </form>
  );
}

