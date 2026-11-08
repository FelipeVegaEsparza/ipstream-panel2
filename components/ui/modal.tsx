'use client'

import { useEffect, useState, createContext, useContext, useRef, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'

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

  const tone = (() => {
    switch (type) {
      case 'success':
        return 'bg-[color:var(--live)]'
      case 'error':
        return 'bg-[color:var(--danger)]'
      case 'warning':
        return 'bg-[color:var(--warn)]'
      default:
        return 'bg-[color:var(--signal)]'
    }
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-[10px] border border-line bg-card shadow-popover"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-[6px] p-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-2 pr-8">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
            <h3 className="text-[15px] font-medium text-foreground">{title}</h3>
          </div>

          <p className="mt-2 text-[13px] leading-5 text-muted-foreground whitespace-pre-line">
            {message}
          </p>

          <div className="mt-5 flex gap-2">
            {type === 'confirm' && onConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-control border border-line px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-3"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className="flex-1 rounded-control bg-signal px-3 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-110"
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full rounded-control bg-signal px-3 py-2 text-[13px] font-medium text-white transition-colors hover:brightness-110"
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
