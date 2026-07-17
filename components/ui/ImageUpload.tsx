'use client'

import { useState, useRef } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { normalizeImageUrl, getStorageImageUrl } from '@/lib/image-url-helper'
import { useToast } from '@/components/ui/toast'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove: () => void
  label?: string
  description?: string
  className?: string
}

export function ImageUpload({ 
  value, 
  onChange, 
  onRemove, 
  label = "Imagen",
  description = "Sube una imagen (JPG, PNG, GIF, WebP - Máx. 5MB)",
  className = ""
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (file: File) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        onChange(data.url)
      } else {
        const error = await response.json()
        toast({ type: 'error', title: error.error || 'Error al subir la imagen' })
      }
    } catch (error) {
      toast({ type: 'error', title: 'Error al subir la imagen' })
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Si es una imagen subida al servidor, intentar eliminarla
    const storageUrl = getStorageImageUrl(value)
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
    
    onRemove()
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="form-label">
        {label}
      </label>
      
      <div className="space-y-3">
        {/* Upload Area */}
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          
          {uploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto"></div>
              <p className="text-sm text-gray-300">Subiendo imagen...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-cyan-400">Haz clic para subir</span> o arrastra una imagen aquí
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current Image Preview */}
        {value && (
          <div className="relative">
            <div className="relative w-full max-w-md mx-auto">
              <Image
                src={normalizeImageUrl(value)}
                alt="Vista previa"
                width={400}
                height={200}
                className="w-full h-48 object-cover rounded-xl border border-gray-600 shadow-lg"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-3 right-3 p-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110"
                title="Eliminar imagen"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              Imagen actual - Haz clic en la X para eliminar
            </p>
          </div>
        )}


      </div>
    </div>
  )
}