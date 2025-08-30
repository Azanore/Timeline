import { useState, useEffect } from 'react';
import { sanitizeText, normalizePartialDate } from '../../utils';
import CONFIG from '../../config/index.js';
import { useValidation } from '../../hooks/useValidation';
import Input from '../ui/Input.jsx';
import Button from '../ui/Button.jsx';
import Textarea from '../ui/Textarea.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select.jsx';

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
    hasDate: Boolean(value?.start && Number.isFinite(Number(value.start.year))),
    start: {
      year: value?.start?.year || CONFIG.events.defaults.startYear,
      month: value?.start?.month ?? 1,
      day: value?.start?.day ?? 1,
      hour: value?.start?.hour ?? 0,
      minute: value?.start?.minute ?? 0,
    },
  }));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Validate only the fields that will be submitted
    const draft = { ...local };
    const submitShape = {
      title: draft.title,
      body: draft.body,
      type: draft.type,
      start: draft.hasDate ? draft.start : undefined,
    };
    const { errors: errs } = validateEvent(submitShape);
    setErrors(errs);
  }, [local, validateEvent]);

  const update = (patch) => setLocal(prev => ({ ...prev, ...patch }));
  const updateStart = (patch) => setLocal(prev => ({ ...prev, start: { ...prev.start, ...patch } }));

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const draft = { ...local };
        const submitShape = {
          title: draft.title,
          body: draft.body,
          type: draft.type,
          start: draft.hasDate ? (normalizePartialDate(draft.start) || { year: CONFIG.events.defaults.startYear, month: 1, day: 1, hour: 0, minute: 0 }) : undefined,
        };
        const { valid } = validateEvent(submitShape);
        if (!valid) return;
        const cleaned = {
          title: sanitizeText(submitShape.title),
          body: sanitizeText(submitShape.body),
          type: submitShape.type,
          ...(draft.hasDate ? { start: submitShape.start } : {}),
        };
        onSubmit?.(cleaned);
      }}
    >
      <div>
        <label className="block text-sm text-foreground mb-1" htmlFor="event-title">
          Title
        </label>
        <Input
          id="event-title"
          value={local.title}
          maxLength={CONFIG.events.textLimits.titleMax}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Event title"
        />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
      </div>

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
          maxLength={CONFIG.events.textLimits.bodyMax}
        />
        {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
      </div>

      {/* Has date switch */}
      <div className="pt-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={local.hasDate}
            onChange={(e) => {
              const checked = e.target.checked;
              setLocal(prev => ({
                ...prev,
                hasDate: checked,
                // When enabling, ensure defaults exist
                start: checked ? {
                  year: prev.start?.year || CONFIG.events.defaults.startYear,
                  month: prev.start?.month ?? 1,
                  day: prev.start?.day ?? 1,
                  hour: prev.start?.hour ?? 0,
                  minute: prev.start?.minute ?? 0,
                } : prev.start,
              }));
            }}
          />
          Has date
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-foreground mb-1" htmlFor="event-year">Year</label>
          <Input
            id="event-year"
            type="number"
            value={local.start.year}
            onChange={(e) => updateStart({ year: Number(e.target.value) })}
            min={CONFIG.events.yearRange.min}
            max={CONFIG.events.yearRange.max}
            placeholder="YYYY"
            disabled={!local.hasDate}
          />
          {errors.start && <p className="text-xs text-destructive mt-1">{errors.start}</p>}
        </div>
        <div>
          <label className="block text-sm text-foreground mb-1">Type</label>
          <Select value={local.type} onValueChange={(val) => update({ type: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="history">History</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="culture">Culture</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-sm text-foreground mb-1">Month</label>
          <Input
            type="number"
            value={local.start.month}
            onChange={(e) => updateStart({ month: e.target.value ? Number(e.target.value) : '' })}
            min={1}
            max={12}
            placeholder="MM"
            disabled={!local.hasDate}
          />
        </div>
        <div>
          <label className="block text-sm text-foreground mb-1">Day</label>
          <Input
            type="number"
            value={local.start.day}
            onChange={(e) => updateStart({ day: e.target.value ? Number(e.target.value) : '' })}
            min={1}
            max={31}
            placeholder="DD"
            disabled={!local.hasDate}
          />
        </div>
        <div>
          <label className="block text-sm text-foreground mb-1">Hour</label>
          <Input
            type="number"
            value={local.start.hour}
            onChange={(e) => updateStart({ hour: e.target.value ? Number(e.target.value) : '' })}
            min={0}
            max={23}
            placeholder="HH"
            disabled={!local.hasDate}
          />
        </div>
        <div>
          <label className="block text-sm text-foreground mb-1">Minute</label>
          <Input
            type="number"
            value={local.start.minute}
            onChange={(e) => updateStart({ minute: e.target.value ? Number(e.target.value) : '' })}
            min={0}
            max={59}
            placeholder="MM"
            disabled={!local.hasDate}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>{labels.cancelLabel}</Button>
        <Button type="submit" variant="solid">{labels.submitLabel}</Button>
      </div>
    </form>
  );
}

