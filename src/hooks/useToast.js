import { useToastContext } from '../context/ToastContext.jsx'
import CONFIG from '../config/index.js'

export function useToast() {
  const { addToast, removeToast, clearToasts } = useToastContext()

  const success = (message, duration = CONFIG.toast.durationMsDefault) => addToast({ type: 'success', message, duration })
  const info = (message, duration = CONFIG.toast.durationMsDefault) => addToast({ type: 'info', message, duration })
  const error = (message, duration = CONFIG.toast.durationMsDefault + 500) => addToast({ type: 'error', message, duration })

  return { success, info, error, addToast, removeToast, clearToasts }
}
