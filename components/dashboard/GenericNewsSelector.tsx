'use client'

import { useState } from 'react'

interface Category {
  id: string
  name: string
  slug: string
}

interface GenericNewsSelectorProps {
  useGenericNews: boolean
  selectedCategories: Category[]
  allCategories: Category[]
}

export function GenericNewsSelector({ useGenericNews, selectedCategories, allCategories }: GenericNewsSelectorProps) {
  const [enabled, setEnabled] = useState(useGenericNews)
  const [selected, setSelected] = useState<string[]>(selectedCategories.map(c => c.id))
  const [saving, setSaving] = useState(false)

  const handleToggle = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/client/generic-news-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useGenericNews: !enabled })
      })
      if (res.ok) {
        setEnabled(!enabled)
        window.location.reload()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCategoryToggle = async (categoryId: string) => {
    const newSelected = selected.includes(categoryId)
      ? selected.filter(id => id !== categoryId)
      : [...selected, categoryId]

    setSelected(newSelected)

    await fetch('/api/client/generic-news-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: newSelected })
    })
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-primary">Noticias desde IpStream</p>
          <p className="text-sm text-muted mt-1">
            {enabled
              ? 'Mostrando noticias proporcionadas por el sistema'
              : 'Usando tus propias noticias'}
          </p>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            Al activar esta opción, tu sitio web mostrará las noticias publicadas desde IpStream
            en lugar de las que crees aquí. Podrás elegir qué categorías de noticias genéricas
            deseas mostrar a tu audiencia.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
            enabled ? 'bg-cyan-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && allCategories.length > 0 && (
        <div>
          <p className="text-sm font-medium text-primary mb-2">
            Selecciona las categorías a mostrar:
          </p>
          <div className="flex flex-wrap gap-3">
            {allCategories.map((cat) => (
              <label
                key={cat.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selected.includes(cat.id)
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(cat.id)}
                  onChange={() => handleCategoryToggle(cat.id)}
                  className="rounded border-gray-500 text-cyan-500 bg-gray-700 focus:ring-cyan-500"
                />
                <span className="text-sm font-medium">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
