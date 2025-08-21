import { useToastContext } from '../context/ToastContext.jsx'

export function useToast() {
  const { addToast, removeToast, clearToasts } = useToastContext()

  const success = (message, duration = 2500) => addToast({ type: 'success', message, duration })
  const info = (message, duration = 2500) => addToast({ type: 'info', message, duration })
  const error = (message, duration = 3000) => addToast({ type: 'error', message, duration })

  return { success, info, error, addToast, removeToast, clearToasts }
}
