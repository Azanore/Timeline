import Modal from '../ui/Modal.jsx';
import EventForm from './EventForm.jsx';
import { useEvents } from '../../hooks/useEvents';
import { useState, useMemo } from 'react';

export default function EventDialog({ open, onClose, event }) {
  const { updateEvent, removeEvent } = useEvents();
  const [isValid, setIsValid] = useState(true);
  const [mode, setMode] = useState('view'); // 'view' | 'edit'

  const fmtDate = useMemo(() => {
    if (!event) return '';
    const s = event.start;
    const e = event.end;
    const startStr = [s?.year, s?.month && String(s.month).padStart(2, '0'), s?.day && String(s.day).padStart(2, '0')]
      .filter(Boolean)
      .join('-');
    const endStr = e && e.year ? [e.year, e?.month && String(e.month).padStart(2, '0'), e?.day && String(e.day).padStart(2, '0')].filter(Boolean).join('-') : null;
    return endStr ? `${startStr} → ${endStr}` : startStr;
  }, [event]);

  if (!event) return null;

  return (
    <Modal open={open} onClose={onClose} ariaLabel={mode === 'edit' ? 'Edit Event' : 'Event Details'}>
      {mode === 'view' ? (
        <div>
          <h3 className="text-lg font-semibold mb-1">{event.title}</h3>
          <div className="mb-3 text-sm text-slate-600 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs border-slate-300">
              <span
                className={
                  `inline-block w-2 h-2 rounded-full ` +
                  (event.type === 'history' ? 'bg-rose-600' :
                   event.type === 'personal' ? 'bg-emerald-600' :
                   event.type === 'science' ? 'bg-blue-600' :
                   event.type === 'culture' ? 'bg-violet-600' :
                   event.type === 'tech' ? 'bg-amber-500' : 'bg-slate-600')
                }
              />
              <span className="capitalize">{event.type || 'other'}</span>
            </span>
            <span aria-label="Event date">{fmtDate}</span>
          </div>
          {event.body && (
            <div className="prose prose-sm max-w-none text-slate-700">
              <p className="whitespace-pre-wrap break-words">{event.body}</p>
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => setMode('edit')}
              >
                Edit
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  removeEvent(event.id);
                  onClose?.();
                }}
              >
                Delete
              </button>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold mb-3">Edit Event</h3>
          <EventForm
            value={event}
            onValidityChange={setIsValid}
            onCancel={() => setMode('view')}
            onSubmit={(val) => {
              if (!isValid) return;
              updateEvent(event.id, { ...event, ...val });
              setMode('view');
            }}
            labels={{ submitLabel: 'Update', cancelLabel: 'Cancel' }}
          />
        </div>
      )}
    </Modal>
  );
}
