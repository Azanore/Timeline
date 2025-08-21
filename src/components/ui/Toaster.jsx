export default function Toaster({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null
  return (
    <div className="fixed z-[60] top-4 right-4 space-y-2 w-80 max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            `flex items-start gap-2 rounded-md shadow-lg border p-3 text-sm bg-white ` +
            (t.type === 'success' ? 'border-emerald-200' : t.type === 'error' ? 'border-rose-200' : 'border-slate-200')
          }
          role="status"
          aria-live="polite"
        >
          <span className={`mt-0.5 inline-block w-2 h-2 rounded-full ` + (t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-rose-600' : 'bg-slate-600')} />
          <div className="flex-1 text-slate-800">{t.message}</div>
          <button
            className="text-slate-500 hover:text-slate-700"
            onClick={() => onDismiss?.(t.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
