'use client'

import { useState, useRef } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { normalizeImageUrl, getStorageImageUrl } from '@/lib/image-url-helper'
import { useToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove: () => void
  label?: string
  description?: string
  className?: string
  /** Preset de procesamiento del endpoint de subida (p. ej. `splash`). */
  preset?: string
}

export function ImageUpload({ 
  value, 
  onChange, 
  onRemove, 
  label,
  description,
  className = "",
  preset
}: ImageUploadProps) {
  const { t } = useDashboardI18n()
  const finalLabel = label ?? t('common.image')
  const finalDescription = description ?? t('common.imageHint')
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

      const response = await fetch(`/api/upload${preset ? `?preset=${encodeURIComponent(preset)}` : ''}`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        onChange(data.url)
      } else {
        const error = await response.json()
        toast({ type: 'error', title: error.error || t('common.uploadImageError') })
      }
    } catch (error) {
      toast({ type: 'error', title: t('common.uploadImageError') })
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
        {finalLabel}
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
              ? 'border-brand bg-brand/10 backdrop-blur-sm' 
              : 'border-border hover:border-brand/50 bg-secondary/30'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/50'}
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
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto"></div>
              <p className="text-sm text-muted-foreground">{t('common.uploadingImage')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <PhotoIcon className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-brand">{t('common.clickToUpload')}</span> {t('common.dragImageHere')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {finalDescription}
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
                alt={t('common.preview')}
                width={400}
                height={200}
                className="w-full h-48 object-cover rounded-xl border border-border shadow-lg"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-3 right-3 p-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110"
                title={t('common.removeImage')}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {t('common.currentImageHint')}
            </p>
          </div>
        )}


      </div>
    </div>
  )
}