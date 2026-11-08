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
            relative cursor-pointer rounded-[10px] border border-dashed p-5 text-center transition-colors
            ${dragOver
              ? 'border-[color:var(--signal)] bg-surface-2'
              : 'border-line hover:border-[color:var(--signal)]/50 hover:bg-surface-2'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
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
            <div className="space-y-2">
              <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-line border-t-[color:var(--signal)]" />
              <p className="text-[13px] text-muted-foreground">{t('common.uploadingImage')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <PhotoIcon className="mx-auto h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-medium text-signal">{t('common.clickToUpload')}</span> {t('common.dragImageHere')}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {finalDescription}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current Image Preview */}
        {value && (
          <div className="relative">
            <div className="relative mx-auto w-full max-w-md">
              <Image
                src={normalizeImageUrl(value)}
                alt={t('common.preview')}
                width={400}
                height={200}
                className="h-48 w-full rounded-[10px] border border-line object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute right-2 top-2 rounded-[6px] border border-line bg-background/90 p-1.5 text-muted-foreground transition-colors hover:bg-[color:var(--danger)]/10 hover:text-[color:var(--danger)]"
                title={t('common.removeImage')}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {t('common.currentImageHint')}
            </p>
          </div>
        )}


      </div>
    </div>
  )
}