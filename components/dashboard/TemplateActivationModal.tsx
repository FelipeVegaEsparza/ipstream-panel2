'use client'

import { useEffect, useState } from 'react'
import { X, Palette, Check } from 'lucide-react'

interface TemplateActivationModalProps {
  isOpen: boolean
  templateName: string
  initialAccentColor: string | null
  isSubmitting: boolean
  onConfirm: (accentColor: string | null) => void
  onClose: () => void
}

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

export function TemplateActivationModal({
  isOpen,
  templateName,
  initialAccentColor,
  isSubmitting,
  onConfirm,
  onClose
}: TemplateActivationModalProps) {
  const [useTemplate, setUseTemplate] = useState(initialAccentColor === null)
  const [hex, setHex] = useState(initialAccentColor ?? '#000000')

  useEffect(() => {
    if (isOpen) {
      setUseTemplate(initialAccentColor === null)
      setHex(initialAccentColor ?? '#000000')
    }
  }, [isOpen, initialAccentColor])

  if (!isOpen) return null

  const isHexValid = HEX_REGEX.test(hex)
  const canConfirm = useTemplate || isHexValid
  const previewColor = useTemplate ? null : (isHexValid ? hex : null)

  const handleConfirm = () => {
    if (!canConfirm || isSubmitting) return
    onConfirm(useTemplate ? null : hex.toLowerCase())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full"
      >
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center mx-auto mb-4">
            <Palette className="h-8 w-8 text-brand" />
          </div>

          <h3 className="text-xl font-bold text-foreground text-center mb-1">
            Activar {templateName}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Elige un color destacado para tu sitio o usa el color propio de la plantilla.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Color destacado"
                value={previewColor ?? '#000000'}
                disabled={isSubmitting}
                onChange={(e) => {
                  setHex(e.target.value)
                  setUseTemplate(false)
                }}
                className="h-12 w-14 rounded-lg bg-background border border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={useTemplate ? '' : hex}
                disabled={isSubmitting}
                placeholder="#ff6b00"
                onChange={(e) => {
                  setHex(e.target.value)
                  setUseTemplate(false)
                }}
                className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-gray-500 focus:outline-none focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {!useTemplate && hex.length > 0 && !isHexValid && (
              <p className="text-sm text-red-400">
                Ingresa un color hexadecimal de 6 dígitos, por ejemplo #ff6b00.
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="inline-block h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: previewColor ?? 'transparent' }}
              />
              {useTemplate ? 'Usando el color de la plantilla' : (isHexValid ? hex.toLowerCase() : 'Color inválido')}
            </div>

            <button
              type="button"
              onClick={() => setUseTemplate(true)}
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                useTemplate
                  ? 'bg-brand text-white'
                  : 'bg-secondary hover:bg-secondary text-foreground'
              } disabled:opacity-50`}
            >
              {useTemplate && <Check className="h-4 w-4" />}
              Usar color de la plantilla
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-secondary hover:bg-secondary text-foreground rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-brand hover:bg-brand text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando...' : 'Activar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
