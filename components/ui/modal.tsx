'use client'

import { useEffect, useState, createContext, useContext, useRef, useCallback, type ReactNode } from 'react'
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm'
  confirmText?: string
  cancelText?: string
}

interface ModalContextType {
  showModal: (config: Omit<ModalProps, 'isOpen' | 'onClose'>) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalConfig, setModalConfig] = useState<Omit<ModalProps, 'isOpen' | 'onClose'> | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const showModal = (config: Omit<ModalProps, 'isOpen' | 'onClose'>) => {
    setModalConfig(config)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setTimeout(() => setModalConfig(null), 200) // Wait for animation
  }

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}
      {modalConfig && (
        <Modal
          {...modalConfig}
          isOpen={isOpen}
          onClose={closeModal}
        />
      )}
    </ModalContext.Provider>
  )
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar'
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const container = containerRef.current
    if (!container) return

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-400" />
      case 'error':
        return <AlertTriangle className="h-12 w-12 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-12 w-12 text-orange-400" />
      case 'confirm':
        return <Info className="h-12 w-12 text-blue-400" />
      default:
        return <Info className="h-12 w-12 text-cyan-400" />
    }
  }

  const getColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/10'
      case 'error':
        return 'border-red-500/30 bg-red-500/10'
      case 'warning':
        return 'border-orange-500/30 bg-orange-500/10'
      case 'confirm':
        return 'border-blue-500/30 bg-blue-500/10'
      default:
        return 'border-cyan-500/30 bg-cyan-500/10'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full animate-in fade-in zoom-in duration-200"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full ${getColor()} flex items-center justify-center mx-auto mb-4`}>
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-white text-center mb-3">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-300 text-center mb-6 whitespace-pre-line">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            {type === 'confirm' && onConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
