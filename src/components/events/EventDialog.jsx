import Modal from '../ui/Modal.jsx';
import EventForm from './EventForm.jsx';
import { useEvents } from '../../hooks/useEvents';
import { useState, useMemo, useEffect } from 'react';
import Button from '../ui/Button.jsx';
import { useToast } from '../../hooks/useToast';
import { formatPartialUTC } from '../../utils';
import TypeBadge from '@/components/ui/TypeBadge.jsx';
import ConfirmDialog from '@/components/ui/ConfirmDialog.jsx';

/**
 * @typedef {Object} EventDialogProps
 * @property {boolean} open
 * @property {() => void} onClose
 * @property {{ id:string, title:string, body?:string, type?:string, start:any, end?:any }} event
 * @property {boolean} [closeOnSave] - If true, closes the dialog after a successful update
 */

/**
 * @param {EventDialogProps} props
 */
export default function EventDialog({ open, onClose, event, closeOnSave = false }) {
  const { updateEvent, removeEvent } = useEvents();
  const toast = useToast();
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Ensure the dialog always opens in view mode and resets on event change
  useEffect(() => {
    if (!open) return;
    setMode('view');
  }, [open, event?.id]);

  const fmtDate = useMemo(() => {
    if (!event) return '';
    const startStr = formatPartialUTC(event.start);
    const endStr = event.end ? formatPartialUTC(event.end) : '';
    return endStr ? `${startStr} → ${endStr}` : startStr;
  }, [event]);

  if (!event) return null;

  return (
    <Modal open={open} onClose={onClose} ariaLabel={mode === 'edit' ? 'Edit Event' : 'Event Details'}>
      {mode === 'view' ? (
        <div>
          <h3 className="text-lg font-semibold mb-1">{event.title}</h3>
          <div className="mb-3 text-sm text-slate-600 flex items-center gap-2">
            <TypeBadge type={event.type || 'other'} />
            <span aria-label="Event date">{fmtDate}</span>
          </div>
          {event.body && (
            <div className="text-sm text-slate-700">
              <p className="whitespace-pre-wrap break-words">{event.body}</p>
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="md" onClick={() => setMode('edit')}>
                Edit
              </Button>
              <Button
                variant="outline"
                size="md"
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
                onClick={() => setConfirmOpen(true)}
              >
                Delete
              </Button>
            </div>
            <Button variant="outline" size="md" onClick={onClose}>
              Close
            </Button>
          </div>
          <ConfirmDialog
            open={confirmOpen}
            title="Delete this event?"
            description="This action cannot be undone. The event will be permanently removed."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            destructive
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              removeEvent(event.id);
              toast.success('Event deleted');
              setConfirmOpen(false);
              onClose?.();
            }}
          />
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold mb-3">Edit Event</h3>
          <EventForm
            value={event}
            onCancel={() => setMode('view')}
            onSubmit={(val) => {
              updateEvent(event.id, { ...event, ...val });
              toast.success('Event updated');
              if (closeOnSave) {
                onClose?.();
              } else {
                setMode('view');
              }
            }}
            labels={{ submitLabel: 'Update', cancelLabel: 'Cancel' }}
          />
        </div>
      )}
    </Modal>
  );
}

