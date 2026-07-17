'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  _count?: { news: number }
}

export function NewsCategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/news-categories')
      if (res.ok) setCategories(await res.json())
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : generateSlug(name)
    }))
  }

  const handleEdit = (cat: Category) => {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '' })
    setEditingId(cat.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Las noticias asociadas también se eliminarán.')) return
    try {
      const res = await fetch(`/api/admin/news-categories/${id}`, { method: 'DELETE' })
      if (res.ok) fetchCategories()
      else alert('Error al eliminar')
    } catch (error) {
      alert('Error al eliminar')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingId
        ? `/api/admin/news-categories/${editingId}`
        : '/api/admin/news-categories'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        setShowForm(false)
        setEditingId(null)
        setForm({ name: '', slug: '', description: '' })
        fetchCategories()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al guardar')
      }
    } catch (error) {
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-400">Cargando categorías...</p>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Categorías de Noticias Genéricas</h2>
          <p className="text-sm text-gray-400">Crea y gestiona las categorías disponibles</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', slug: '', description: '' }) }}
            className="bg-blue-600 hover:bg-blue-700">
            <PlusIcon className="h-4 w-4 mr-2" /> Nueva Categoría
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-white">
            {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nombre</label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción (opcional)</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}
              className="border-gray-600 hover:bg-gray-700">
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay categorías creadas</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-800 border border-gray-700">
              <div>
                <h4 className="text-white font-medium">{cat.name}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-xs text-cyan-400 bg-gray-700 px-2 py-0.5 rounded">/{cat.slug}</code>
                  {cat.description && <span className="text-sm text-gray-400">{cat.description}</span>}
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                    {cat._count?.news || 0} noticias
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(cat)} className="p-2 text-gray-400 hover:text-cyan-400 transition-colors">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
