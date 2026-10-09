'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Image as ImageIcon } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { TemplateActivationModal } from '@/components/dashboard/TemplateActivationModal'

interface Template {
  id: string
  name: string
  displayName: string
  description: string | null
  imageUrl: string | null
}

interface TemplateSelectorProps {
  templates: Template[]
  currentTemplateId: string | null
  currentAccentColor: string | null
}

export function TemplateSelector({ templates, currentTemplateId, currentAccentColor }: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(currentTemplateId)
  const [accentColor, setAccentColor] = useState<string | null>(currentAccentColor)
  const [activationTemplate, setActivationTemplate] = useState<Template | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info' | 'confirm',
    title: '',
    message: ''
  })

  const showModalMessage = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message })
  }

  const closeModal = () => {
    setModal({ ...modal, isOpen: false })
  }

  const openActivation = (template: Template) => {
    setActivationTemplate(template)
  }

  const closeActivation = () => {
    if (isSubmitting) return
    setActivationTemplate(null)
  }

  const handleConfirmActivation = async (newAccentColor: string | null) => {
    if (!activationTemplate) return
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/dashboard/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: activationTemplate.id,
          accentColor: newAccentColor
        })
      })

      if (response.ok) {
        setSelectedTemplateId(activationTemplate.id)
        setAccentColor(newAccentColor)
        setActivationTemplate(null)
        showModalMessage('success', 'Plantilla activada', 'La plantilla y el color destacado se aplicaron a tu sitio web')
      } else {
        const error = await response.json().catch(() => ({}))
        setActivationTemplate(null)
        showModalMessage('error', 'Error', error.error || 'Error al activar la plantilla')
      }
    } catch {
      setActivationTemplate(null)
      showModalMessage('error', 'Error', 'Error al activar la plantilla')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      <TemplateActivationModal
        isOpen={activationTemplate !== null}
        templateName={activationTemplate?.displayName ?? ''}
        initialAccentColor={accentColor}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmActivation}
        onClose={closeActivation}
      />
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Plantilla del Sitio
        </h1>
        <p className="text-muted-foreground">
          Selecciona la plantilla que deseas usar para tu sitio web
        </p>
      </div>

      {selectedTemplateId && (
        <Card className="bg-gradient-to-r from-brand/20 to-brand/20 border-brand/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand/20 p-2 rounded-lg">
                <Check className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand">
                  Plantilla Actual
                </p>
                <p className="text-xs text-muted-foreground">
                  {templates.find(t => t.id === selectedTemplateId)?.displayName || 'Sin plantilla'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => {
          const isSelected = template.id === selectedTemplateId
          
          return (
            <Card 
              key={template.id} 
              className={`bg-card border-2 overflow-hidden transition-all duration-200 ${
                isSelected 
                  ? 'border-brand shadow-lg shadow-cyan-500/20' 
                  : 'border-border hover:border-border'
              }`}
            >
              {template.imageUrl && (
                <div className="w-full h-96 bg-secondary relative">
                  <img
                    src={template.imageUrl}
                    alt={template.displayName}
                    className="w-full h-full object-contain p-4"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-brand text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Seleccionada
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              {!template.imageUrl && (
                <div className="w-full h-96 bg-secondary flex items-center justify-center relative">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-brand text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Seleccionada
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {template.displayName}
                </h3>

                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {template.description}
                  </p>
                )}

                <Button
                  onClick={() => openActivation(template)}
                  disabled={isSubmitting}
                  className={`w-full ${
                    isSelected 
                      ? 'bg-brand hover:bg-brand' 
                      : 'bg-brand hover:bg-brand'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Color destacado
                    </>
                  ) : (
                    'Seleccionar Plantilla'
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No hay plantillas disponibles
            </h3>
            <p className="text-muted-foreground">
              Contacta al administrador para que agregue plantillas
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
