import { useState, useEffect } from 'react';
import { sanitizeText, normalizePartialDate } from '../../utils';
import CONFIG from '../../config/index.js';
import { useValidation } from '../../hooks/useValidation';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import Textarea from '../ui/Textarea.jsx';
import Select from '../ui/Select.jsx';

/**
 * @typedef EventInput
 * @property {string} title
 * @property {string} body
 * @property {'history'|'personal'|'science'|'culture'|'tech'|'other'} type
 * @property {{year:number, month?:number, day?:number, hour?:number, minute?:number}} start
 */

/**
 * @typedef {Object} EventFormProps
 * @property {EventInput} [value]
 * @property {(val: EventInput) => void} [onChange]
 * @property {(valid: boolean) => void} [onValidityChange]
 * @property {() => void} [onCancel]
 * @property {(val: EventInput) => void} [onSubmit]
 * @property {{ submitLabel?: string, cancelLabel?: string }} [labels]
 */

/**
 * @param {EventFormProps} props
 */
export default function EventForm({ value, onCancel, onSubmit, labels = { submitLabel: 'Save', cancelLabel: 'Cancel' } }) {
  const { validateEvent } = useValidation();
  const [local, setLocal] = useState(() => ({
    title: value?.title || '',
    body: value?.body || '',
    type: value?.type || 'other',
    start: {
      year: value?.start?.year || CONFIG.events.defaults.startYear,
      month: value?.start?.month ?? 1,
      day: value?.start?.day ?? 1,
      hour: value?.start?.hour ?? 0,
      minute: value?.start?.minute ?? 0,
    },
    end: value?.end ? {
      year: value?.end?.year ?? value?.start?.year ?? CONFIG.events.defaults.startYear,
      month: value?.end?.month ?? CONFIG.events.defaults.end.month,
      day: value?.end?.day ?? CONFIG.events.defaults.end.day,
      hour: value?.end?.hour ?? CONFIG.events.defaults.end.hour,
      minute: value?.end?.minute ?? CONFIG.events.defaults.end.minute,
    } : null,
  }));
  const [errors, setErrors] = useState({});
  const [endEnabled, setEndEnabled] = useState(!!value?.end);

  useEffect(() => {
    const draft = { ...local, end: endEnabled ? local.end : null };
    const { errors: errs } = validateEvent({ ...draft, title: local.title });
    setErrors(errs);
  }, [local, endEnabled, validateEvent]);

  const update = (patch) => setLocal(prev => ({ ...prev, ...patch }));
  const updateStart = (patch) => setLocal(prev => ({ ...prev, start: { ...prev.start, ...patch } }));
  const updateEnd = (patch) => setLocal(prev => ({ ...prev, end: { ...(prev.end || {}), ...patch } }));

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const draft = { ...local, end: endEnabled ? (local.end || { year: local.start.year, ...CONFIG.events.defaults.end }) : null };
        const { valid } = validateEvent(draft);
        if (!valid) return;
        const cleaned = {
          ...draft,
          title: sanitizeText(draft.title),
          body: sanitizeText(draft.body),
          start: normalizePartialDate(draft.start),
          end: endEnabled && draft.end ? normalizePartialDate(draft.end) : undefined,
        };
        onSubmit?.(cleaned);
      }}
    >
      <Input
        id="event-title"
        label="Title"
        value={local.title}
        maxLength={CONFIG.events.textLimits.titleMax}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Event title"
        error={errors.title}
      />

      {/* Body textarea */}
      <div>
        <label className="block text-sm text-foreground mb-1" htmlFor="event-body">
          Body <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="event-body"
          value={local.body}
          onChange={(e) => update({ body: e.target.value })}
          placeholder="Details or description"
          rows={4}
          error={Boolean(errors.body)}
          maxLength={CONFIG.events.textLimits.bodyMax}
        />
        {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="event-year"
          label="Year"
          type="number"
          value={local.start.year}
          onChange={(e) => updateStart({ year: Number(e.target.value) })}
          min={CONFIG.events.yearRange.min}
          max={CONFIG.events.yearRange.max}
          placeholder="YYYY"
          error={errors.start}
        />
        <div>
          <label className="block text-sm text-foreground mb-1">Type</label>
          <Select
            value={local.type}
            onChange={(e) => update({ type: e.target.value })}
          >
            <option value="history">History</option>
            <option value="personal">Personal</option>
            <option value="science">Science</option>
            <option value="culture">Culture</option>
            <option value="tech">Tech</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Input
          label="Month"
          type="number"
          value={local.start.month}
          onChange={(e) => updateStart({ month: e.target.value ? Number(e.target.value) : '' })}
          min={1}
          max={12}
          placeholder="MM"
        />
        <Input
          label="Day"
          type="number"
          value={local.start.day}
          onChange={(e) => updateStart({ day: e.target.value ? Number(e.target.value) : '' })}
          min={1}
          max={31}
          placeholder="DD"
        />
        <Input
          label="Hour"
          type="number"
          value={local.start.hour}
          onChange={(e) => updateStart({ hour: e.target.value ? Number(e.target.value) : '' })}
          min={0}
          max={23}
          placeholder="HH"
        />
        <Input
          label="Minute"
          type="number"
          value={local.start.minute}
          onChange={(e) => updateStart({ minute: e.target.value ? Number(e.target.value) : '' })}
          min={0}
          max={59}
          placeholder="MM"
        />
      </div>

      <div className="pt-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={endEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              setEndEnabled(checked);
              if (checked && !local.end) {
                setLocal(prev => ({
                  ...prev,
                  end: {
                    year: prev.start.year,
                    ...CONFIG.events.defaults.end,
                  },
                }));
              }
            }}
          />
          Period (has end date)
        </label>
      </div>

      {endEnabled && (
        <div className="grid grid-cols-5 gap-3">
          <Input
            label="End Year"
            type="number"
            value={local.end?.year || ''}
            onChange={(e) => updateEnd({ year: e.target.value ? Number(e.target.value) : '' })}
            id="event-end-year"
            min={CONFIG.events.yearRange.min}
            max={CONFIG.events.yearRange.max}
            placeholder="YYYY"
          />
          <Input
            label="Month"
            type="number"
            value={local.end?.month || ''}
            onChange={(e) => updateEnd({ month: e.target.value ? Number(e.target.value) : '' })}
            min={1}
            max={12}
            placeholder="MM"
          />
          <Input
            label="Day"
            type="number"
            value={local.end?.day || ''}
            onChange={(e) => updateEnd({ day: e.target.value ? Number(e.target.value) : '' })}
            min={1}
            max={31}
            placeholder="DD"
          />
          <Input
            label="Hour"
            type="number"
            value={local.end?.hour || ''}
            onChange={(e) => updateEnd({ hour: e.target.value ? Number(e.target.value) : '' })}
            min={0}
            max={23}
            placeholder="HH"
          />
          <Input
            label="Minute"
            type="number"
            value={local.end?.minute || ''}
            onChange={(e) => updateEnd({ minute: e.target.value ? Number(e.target.value) : '' })}
            min={0}
            max={59}
            placeholder="MM"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>{labels.cancelLabel}</Button>
        <Button type="submit" variant="solid">{labels.submitLabel}</Button>
      </div>
    </form>
  );
}

