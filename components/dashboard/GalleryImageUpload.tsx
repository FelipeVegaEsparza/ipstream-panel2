'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useRef } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { normalizeImageUrl, getStorageImageUrl } from '@/lib/image-url-helper'

interface GalleryImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  label?: string
  description?: string
}

export function GalleryImageUpload({
  images,
  onChange,
  label = 'Galería de Imágenes',
  description = 'Sube las imágenes de la galería (JPG, PNG, WebP - Máx. 5MB c/u)',
}: GalleryImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File): Promise<string | null> => {
    if (!file) return null

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      return data.url
    }

    const error = await response.json().catch(() => ({}))
    showToast({ type: 'error', title: error.error || 'Error al subir la imagen' })
    return null
  }

  const processFiles = async (files: File[]) => {
    if (files.length === 0 || uploading) return

    setUploading(true)
    const base = [...images]
    const uploaded: string[] = []

    try {
      for (const file of files) {
        const url = await handleFileSelect(file)
        if (url) {
          uploaded.push(url)
          onChange([...base, ...uploaded])
        }
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error al subir la imagen' })
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      processFiles(Array.from(files).filter((file) => file.type.startsWith('image/')))
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files) {
      processFiles(Array.from(files).filter((file) => file.type.startsWith('image/')))
    }
  }

  const handleRemove = async (index: number) => {
    const url = images[index]
    const storageUrl = getStorageImageUrl(url)
    if (storageUrl?.startsWith('/uploads/')) {
      try {
        const fileName = storageUrl.split('/').pop()
        if (fileName) {
          await fetch(`/api/upload/delete?file=${fileName}`, {
            method: 'DELETE',
          })
        }
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    }
    onChange(images.filter((_, i) => i !== index))
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newImages = [...images]
    const [moved] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, moved)
    onChange(newImages)
  }

  return (
    <div className="space-y-3">
      <label className="form-label">{label}</label>

      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${dragOver
            ? 'border-cyan-400 bg-cyan-500/10 backdrop-blur-sm'
            : 'border-gray-600 hover:border-cyan-500/50 bg-gray-700/30'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700/50'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto" />
            <p className="text-sm text-gray-300">Subiendo imágenes...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-cyan-400">Haz clic para subir</span> o arrastra imágenes aquí
              </p>
              <p className="text-xs text-gray-500 mt-2">{description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-400">
              {images.length} {images.length === 1 ? 'imagen' : 'imágenes'} seleccionada{images.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-500">Arrastra para reordenar</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((url, index) => (
              <div key={url} className="relative group aspect-square">
                <Image
                  src={normalizeImageUrl(url)}
                  alt={`Imagen ${index + 1}`}
                  fill
                  className="object-cover rounded-lg border border-gray-600"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (index > 0) handleReorder(index, index - 1)
                    }}
                    className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
                    title="Mover izquierda"
                    disabled={index === 0}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-white text-xs font-bold bg-black/50 px-2 py-0.5 rounded">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (index < images.length - 1) handleReorder(index, index + 1)
                    }}
                    className="p-1.5 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors"
                    title="Mover derecha"
                    disabled={index === images.length - 1}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(index)
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                  title="Eliminar imagen"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
