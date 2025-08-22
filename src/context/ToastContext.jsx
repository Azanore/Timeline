import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import Toaster from '../components/ui/Toaster.jsx'
import CONFIG from '../config/index.js'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const duration = toast.duration ?? CONFIG.toast.durationMsDefault
    const entry = { id, type: toast.type || 'info', message: toast.message, duration }
    setToasts((prev) => [...prev, entry])
    return id
  }, [])

  const clearToasts = useCallback(() => setToasts([]), [])

  // Auto-dismiss handling
  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => {
        removeToast(t.id)
      }, t.duration)
    )
    return () => timers.forEach((tmr) => clearTimeout(tmr))
  }, [toasts, removeToast])

  const value = useMemo(() => ({ addToast, removeToast, clearToasts }), [addToast, removeToast, clearToasts])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}
