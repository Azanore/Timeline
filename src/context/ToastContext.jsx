import { createContext, useContext, useMemo, useCallback } from 'react'
import { Toaster } from '../components/ui/Toaster.jsx'
import { toast as sonner } from 'sonner'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const removeToast = useCallback((id) => {
    sonner.dismiss(id)
  }, [])

  const addToast = useCallback((toast) => {
    const opts = { duration: toast.duration }
    const type = toast.type || 'info'
    if (type === 'success') return sonner.success(toast.message, opts)
    if (type === 'error') return sonner.error(toast.message, opts)
    if (type === 'warning' || type === 'warn') return sonner.warning?.(toast.message, opts) || sonner.message(toast.message, opts)
    return sonner.message(toast.message, opts)
  }, [])

  const clearToasts = useCallback(() => sonner.dismiss(), [])

  const value = useMemo(() => ({ addToast, removeToast, clearToasts }), [addToast, removeToast, clearToasts])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}
