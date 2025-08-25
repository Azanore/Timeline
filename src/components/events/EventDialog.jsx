import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Modal.jsx';
import EventForm from './EventForm.jsx';
import { useEvents } from '../../hooks/useEvents';
import { useState, useMemo, useEffect } from 'react';
import Button from '../ui/Button.jsx';
import { useToast } from '../../hooks/useToast';
import { formatPartialUTC } from '../../utils';
import TypeBadge from '@/components/ui/TypeBadge.jsx';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/ConfirmDialog.jsx';
import { Pencil, Trash2, X, AlertTriangle } from 'lucide-react';

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
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogContent aria-label={mode === 'edit' ? 'Edit Event' : 'Event Details'}>
      {mode === 'view' ? (
        <div>
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
            <DialogDescription className="sr-only">View details for the selected event.</DialogDescription>
          </DialogHeader>
          <div className="mb-3 text-sm text-muted-foreground flex items-center gap-2">
            <TypeBadge type={event.type || 'other'} />
            <span aria-label="Event date">{fmtDate}</span>
          </div>
          {event.body && (
            <div className="text-sm text-foreground">
              <p className="whitespace-pre-wrap break-words">{event.body}</p>
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="md" onClick={() => setMode('edit')} className="gap-2">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Edit</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                className="border-destructive text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Delete</span>
              </Button>
            </div>
            <Button variant="outline" size="md" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" aria-hidden="true" />
              <span>Close</span>
            </Button>
          </div>
          <AlertDialog open={confirmOpen} onOpenChange={(next) => { if (!next) setConfirmOpen(false); }}>
            <AlertDialogContent>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                <span>Delete this event?</span>
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The event will be permanently removed.
              </AlertDialogDescription>
              <div className="flex justify-end gap-2 pt-2">
                <AlertDialogCancel asChild>
                  <Button variant="outline">Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10 gap-2"
                    onClick={() => {
                      removeEvent(event.id);
                      toast.success('Event deleted');
                      setConfirmOpen(false);
                      onClose?.();
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Delete</span>
                  </Button>
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <div>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription className="sr-only">Update the details for this event.</DialogDescription>
          </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}

