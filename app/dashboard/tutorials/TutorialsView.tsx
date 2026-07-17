'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, PlayCircle, Play } from 'lucide-react'
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnailUrl, getYouTubeThumbnailFallbackUrl } from '@/lib/youtube'

interface TutorialCategory {
  id: string
  name: string
  description: string | null
  order: number
}

interface Tutorial {
  id: string
  title: string
  description: string | null
  youtubeUrl: string
  categoryId: string
  order: number
}

interface TutorialsViewProps {
  initialCategories: TutorialCategory[]
  initialTutorials: Tutorial[]
}

export function TutorialsView({ initialCategories, initialTutorials }: TutorialsViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [openTutorial, setOpenTutorial] = useState<Tutorial | null>(null)
  const [thumbErrors, setThumbErrors] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return initialTutorials
    return initialTutorials.filter((t) => t.categoryId === activeCategory)
  }, [activeCategory, initialTutorials])

  const grouped = useMemo(() => {
    const map = new Map<string, Tutorial[]>()
    for (const t of initialTutorials) {
      const arr = map.get(t.categoryId) ?? []
      arr.push(t)
      map.set(t.categoryId, arr)
    }
    return map
  }, [initialTutorials])

  const openVideoId = openTutorial ? extractYouTubeId(openTutorial.youtubeUrl) : null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenTutorial(null)
    }
    if (openTutorial) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  }, [openTutorial])

  if (initialCategories.length === 0) {
    return (
      <div className="text-center py-16">
        <PlayCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No hay tutoriales aún</h2>
        <p className="text-gray-400">
          Vuelve pronto, estamos preparando contenido para ti.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tutoriales</h1>
        <p className="mt-1 text-sm text-gray-400">
          Aprende a usar la plataforma con nuestros videos paso a paso
        </p>
      </div>

      <div className="flex gap-2 flex-wrap border-b border-gray-700 pb-3">
        <CategoryTab
          label="Todos"
          count={initialTutorials.length}
          active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
        />
        {initialCategories.map((c) => (
          <CategoryTab
            key={c.id}
            label={c.name}
            count={grouped.get(c.id)?.length ?? 0}
            active={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">
          No hay tutoriales en esta categoría.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const videoId = extractYouTubeId(t.youtubeUrl)
            const thumb = videoId
              ? thumbErrors[t.id]
                ? getYouTubeThumbnailFallbackUrl(videoId)
                : getYouTubeThumbnailUrl(videoId)
              : null
            const category = initialCategories.find((c) => c.id === t.categoryId)
            return (
              <button
                key={t.id}
                onClick={() => setOpenTutorial(t)}
                className="text-left bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-cyan-500 transition-colors group"
              >
                <div className="relative aspect-video bg-gray-900">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={t.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => setThumbErrors((prev) => ({ ...prev, [t.id]: true }))}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <PlayCircle className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-cyan-500 rounded-full p-3">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  {category && (
                    <p className="text-xs text-cyan-400 font-medium uppercase tracking-wide">
                      {category.name}
                    </p>
                  )}
                  <h3 className="text-white font-semibold line-clamp-2 group-hover:text-cyan-300 transition-colors">
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{t.description}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openTutorial && openVideoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setOpenTutorial(null)}
        >
          <div
            className="bg-gray-800 rounded-2xl border border-gray-700 max-w-4xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-white">{openTutorial.title}</h3>
                {initialCategories.find((c) => c.id === openTutorial.categoryId) && (
                  <p className="text-xs text-cyan-400 uppercase tracking-wide">
                    {initialCategories.find((c) => c.id === openTutorial.categoryId)?.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setOpenTutorial(null)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label="Cerrar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={getYouTubeEmbedUrl(openVideoId)}
                title={openTutorial.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            {openTutorial.description && (
              <div className="p-4 text-gray-300 text-sm">
                {openTutorial.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
        active
          ? 'bg-cyan-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
    >
      {label}
      <span
        className={`text-xs px-1.5 py-0.5 rounded ${
          active ? 'bg-cyan-700' : 'bg-gray-700'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
