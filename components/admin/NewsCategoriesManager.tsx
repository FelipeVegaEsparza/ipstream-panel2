'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  _count?: { news: number }
}

export function NewsCategoriesManager() {
  const { t } = useDashboardI18n()
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
    if (!confirm(t('admin.newsCategories.deleteConfirm'))) return
    try {
      const res = await fetch(`/api/admin/news-categories/${id}`, { method: 'DELETE' })
      if (res.ok) fetchCategories()
      else showToast({ type: 'error', title: t('admin.newsCategories.deleteError') })
    } catch (error) {
      showToast({ type: 'error', title: t('admin.newsCategories.deleteError') })
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
        showToast({ type: 'error', title: data.error || t('admin.newsCategories.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('admin.newsCategories.saveError') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">{t('admin.newsCategories.loading')}</p>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t('admin.newsCategories.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin.newsCategories.subtitle')}</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', slug: '', description: '' }) }}
            className="bg-brand hover:bg-brand">
            <PlusIcon className="h-4 w-4 mr-2" /> {t('admin.newsCategories.new')}
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-foreground">
            {editingId ? t('admin.newsCategories.edit') : t('admin.newsCategories.new')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t('admin.newsCategories.name')}</label>
              <Input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">{t('admin.newsCategories.slug')}</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="bg-secondary border-border text-foreground"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">{t('admin.newsCategories.description')}</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-secondary border-border text-foreground"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-brand hover:bg-brand">
              {saving ? t('common.saving') : editingId ? t('admin.newsCategories.update') : t('admin.newsCategories.create')}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}
              className="border-border hover:bg-secondary">
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('admin.newsCategories.empty')}</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
              <div>
                <h4 className="text-foreground font-medium">{cat.name}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-xs text-brand bg-secondary px-2 py-0.5 rounded">/{cat.slug}</code>
                  {cat.description && <span className="text-sm text-muted-foreground">{cat.description}</span>}
                  <Badge className="bg-brand/20 text-brand border-brand/30">
                    {t('admin.newsCategories.newsCount', { count: cat._count?.news || 0 })}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(cat)} className="p-2 text-muted-foreground hover:text-brand transition-colors">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-muted-foreground hover:text-red-400 transition-colors">
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
