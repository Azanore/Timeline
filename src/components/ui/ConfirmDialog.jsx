import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogOverlay = React.forwardRef(function AlertDialogOverlay({ className = '', ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
});

const AlertDialogContent = React.forwardRef(function AlertDialogContent({ className = '', ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-[70] grid w-full max-w-md gap-4 rounded-md border bg-background p-6 shadow-lg duration-200',
          'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
});

const AlertDialogHeader = ({ className = '', ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

const AlertDialogFooter = ({ className = '', ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

const AlertDialogTitle = React.forwardRef(function AlertDialogTitle({ className = '', ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
  );
});

const AlertDialogDescription = React.forwardRef(function AlertDialogDescription({ className = '', ...props }, ref) {
  return (
    <AlertDialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
});

const AlertDialogCancel = React.forwardRef(function AlertDialogCancel({ className = '', ...props }, ref) {
  return <AlertDialogPrimitive.Cancel ref={ref} className={cn(className)} {...props} />;
});

const AlertDialogAction = React.forwardRef(function AlertDialogAction({ className = '', ...props }, ref) {
  return <AlertDialogPrimitive.Action ref={ref} className={cn(className)} {...props} />;
});

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
