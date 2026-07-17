'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Image as ImageIcon } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

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
}

export function TemplateSelector({ templates, currentTemplateId }: TemplateSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(currentTemplateId)
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

  const handleSelectTemplate = async (templateId: string) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/dashboard/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      })

      if (response.ok) {
        showModalMessage('success', 'Plantilla seleccionada', 'La plantilla se aplicó correctamente a tu sitio web')
        setSelectedTemplateId(templateId)
      } else {
        const error = await response.json()
        showModalMessage('error', 'Error', error.error || 'Error al seleccionar la plantilla')
      }
    } catch (error) {
      showModalMessage('error', 'Error', 'Error al seleccionar la plantilla')
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Plantilla del Sitio
        </h1>
        <p className="text-gray-400">
          Selecciona la plantilla que deseas usar para tu sitio web
        </p>
      </div>

      {selectedTemplateId && (
        <Card className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/20 p-2 rounded-lg">
                <Check className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-cyan-300">
                  Plantilla Actual
                </p>
                <p className="text-xs text-gray-400">
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
              className={`bg-gray-800 border-2 overflow-hidden transition-all duration-200 ${
                isSelected 
                  ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {template.imageUrl && (
                <div className="w-full h-96 bg-gray-700 relative">
                  <img
                    src={template.imageUrl}
                    alt={template.displayName}
                    className="w-full h-full object-contain p-4"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-cyan-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Seleccionada
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              {!template.imageUrl && (
                <div className="w-full h-96 bg-gray-700 flex items-center justify-center relative">
                  <ImageIcon className="h-16 w-16 text-gray-600" />
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-cyan-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Seleccionada
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {template.displayName}
                </h3>

                {template.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {template.description}
                  </p>
                )}

                <Button
                  onClick={() => handleSelectTemplate(template.id)}
                  disabled={isSubmitting || isSelected}
                  className={`w-full ${
                    isSelected 
                      ? 'bg-cyan-600 hover:bg-cyan-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Plantilla Actual
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
            <ImageIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No hay plantillas disponibles
            </h3>
            <p className="text-gray-400">
              Contacta al administrador para que agregue plantillas
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
