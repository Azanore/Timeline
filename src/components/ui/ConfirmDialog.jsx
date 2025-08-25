import React, { useState } from 'react';
import Modal from '@/components/ui/Modal.jsx';
import Button from '@/components/ui/Button.jsx';

/**
 * Simple confirmation dialog built on top of Modal.
 * Props:
 * - open: boolean
 * - title: string
 * - description?: string | ReactNode
 * - confirmLabel?: string (default: 'Confirm')
 * - cancelLabel?: string (default: 'Cancel')
 * - destructive?: boolean (styles the confirm button)
 * - onConfirm: () => void
 * - onCancel: () => void
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Modal open={open} onClose={onCancel} ariaLabel={title || 'Confirm'}>
      <div className="space-y-3">
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'outline' : 'solid'}
            className={destructive ? 'border-rose-300 text-rose-700 hover:bg-rose-50' : ''}
            onClick={async () => {
              try {
                setSubmitting(true);
                await onConfirm?.();
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
