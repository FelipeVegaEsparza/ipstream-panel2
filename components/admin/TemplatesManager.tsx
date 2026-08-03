'use client'

import { useRouter } from 'next/navigation'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Image as ImageIcon, Users } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Modal } from '@/components/ui/modal'

interface Template {
  id: string
  name: string
  displayName: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  createdAt: Date
  _count?: {
    clients: number
  }
}

interface TemplatesManagerProps {
  templates: Template[]
}

export function TemplatesManager({ templates: initialTemplates }: TemplatesManagerProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info' | 'confirm',
    title: '',
    message: '',
    onConfirm: undefined as (() => void) | undefined
  })

  // Form state
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isActive, setIsActive] = useState(true)

  const showModalMessage = (
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm',
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setModal({ isOpen: true, type, title, message, onConfirm })
  }

  const closeModal = () => {
    setModal({ ...modal, isOpen: false })
  }

  const resetForm = () => {
    setName('')
    setDisplayName('')
    setDescription('')
    setImageUrl('')
    setIsActive(true)
    setEditingTemplate(null)
    setShowForm(false)
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setName(template.name)
    setDisplayName(template.displayName)
    setDescription(template.description || '')
    setImageUrl(template.imageUrl || '')
    setIsActive(template.isActive)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingTemplate
        ? `/api/admin/templates/${editingTemplate.id}`
        : '/api/admin/templates'

      const method = editingTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          displayName,
          description,
          imageUrl,
          isActive
        })
      })

      if (response.ok) {
        showModalMessage('success', 
          editingTemplate ? 'Plantilla actualizada' : 'Plantilla creada',
          editingTemplate 
            ? 'La plantilla se actualizó correctamente' 
            : 'La plantilla se creó correctamente'
        )
        resetForm()
        setTimeout(() => router.refresh(), 1500)
      } else {
        const error = await response.json()
        showModalMessage('error', 'Error', error.error || 'Error al guardar la plantilla')
      }
    } catch (error) {
      showModalMessage('error', 'Error', 'Error al guardar la plantilla')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (template: Template) => {
    showModalMessage('confirm', 
      'Eliminar plantilla',
      `¿Estás seguro de que deseas eliminar la plantilla "${template.displayName}"?`,
      async () => {
        try {
          const response = await fetch(`/api/admin/templates/${template.id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            showModalMessage('success', 'Plantilla eliminada', 'La plantilla se eliminó correctamente')
            setTemplates(templates.filter(t => t.id !== template.id))
          } else {
            const error = await response.json()
            showModalMessage('error', 'Error', error.error || 'Error al eliminar la plantilla')
          }
        } catch (error) {
          showModalMessage('error', 'Error', 'Error al eliminar la plantilla')
        }
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Plantillas de Sitio</h2>
          <p className="text-gray-400 text-sm">
            Gestiona las plantillas disponibles para los clientes
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 block mb-2">
                    Nombre Técnico <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="plantilla-moderna"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Nombre único sin espacios (ej: plantilla-moderna)
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-300 block mb-2">
                    Nombre para Mostrar <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Plantilla Moderna"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción de la plantilla..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Imagen de Preview
                </label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  onRemove={() => setImageUrl('')}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">
                  Plantilla activa (visible para clientes)
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1 border-gray-600 hover:bg-gray-700"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : editingTemplate ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="bg-gray-800 border-gray-700 overflow-hidden">
            {template.imageUrl && (
              <div className="w-full h-96 bg-gray-700 relative">
                <img
                  src={template.imageUrl}
                  alt={template.displayName}
                  className="w-full h-full object-contain p-4"
                />
              </div>
            )}
            {!template.imageUrl && (
              <div className="w-full h-96 bg-gray-700 flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-600" />
              </div>
            )}

            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {template.displayName}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mb-2">
                    {template.name}
                  </p>
                </div>
                <Badge className={template.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                  {template.isActive ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>

              {template.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <Users className="h-3 w-3" />
                <span>{template._count?.clients || 0} cliente(s) usando</span>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleEdit(template)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDelete(template)}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No hay plantillas creadas
            </h3>
            <p className="text-gray-400 mb-4">
              Crea tu primera plantilla para que los clientes puedan seleccionarla
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Plantilla
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
