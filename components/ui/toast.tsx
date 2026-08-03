'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'> & { duration?: number }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastRef: ToastContextValue['toast'] | null = null

export function showToast(opts: Omit<Toast, 'id'> & { duration?: number }) {
  if (toastRef) {
    toastRef(opts)
  } else {
    console.warn('showToast llamado sin ToastProvider montado')
  }
}

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
  info: <Info className="h-5 w-5 text-cyan-400" />,
}

const BORDER_COLORS: Record<ToastType, string> = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  warning: 'border-yellow-500/30',
  info: 'border-cyan-500/30',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((opts: Omit<Toast, 'id'> & { duration?: number }) => {
    const id = Math.random().toString(36).slice(2, 9)
    const duration = opts.duration ?? (opts.type === 'error' ? 6000 : 4000)
    setToasts((prev) => [...prev, { id, ...opts }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  // Exponer referencia para llamadas imperativas (showToast)
  toastRef = toast

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-gray-800 border ${BORDER_COLORS[t.type]} shadow-xl animate-slide-in-right`}
          >
            <div className="mt-0.5 flex-shrink-0">{ICONS[t.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{t.title}</p>
              {t.description && (
                <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 p-0.5 rounded text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de un ToastProvider')
  }
  return ctx
}
