'use client'

import { useState, useRef } from 'react'
import { DocumentIcon, XMarkIcon, MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface FileUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove: () => void
  accept: string
  fileType: 'audio' | 'video'
  label?: string
  description?: string
  className?: string
}

export function FileUpload({ 
  value, 
  onChange, 
  onRemove, 
  accept,
  fileType,
  label,
  description,
  className = ""
}: FileUploadProps) {
  const { t } = useDashboardI18n()
  const finalLabel = label ?? t('common.file')
  const finalDescription = description ?? t('common.fileHint')
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
        toast({ type: 'error', title: error.error || t('common.uploadFileError') })
      }
    } catch (error) {
      toast({ type: 'error', title: t('common.uploadFileError') })
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
    if (file) {
      const isValidType = fileType === 'audio' 
        ? file.type.startsWith('audio/') 
        : file.type.startsWith('video/')
      
      if (isValidType) {
        handleFileSelect(file)
      } else {
        toast({ type: 'error', title: `Por favor selecciona un archivo de ${fileType}` })
      }
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
    
    // Si es un archivo subido al servidor, intentar eliminarlo
    if (value?.startsWith('/api/uploads/')) {
      try {
        const fileName = value.split('/').pop()
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

  const getFileIcon = () => {
    if (fileType === 'audio') {
      return <MusicalNoteIcon className="mx-auto h-5 w-5 text-muted-foreground" />
    } else {
      return <VideoCameraIcon className="mx-auto h-5 w-5 text-muted-foreground" />
    }
  }

  const getFileName = () => {
    if (!value) return null
    return value.split('/').pop()?.replace(/^\d+_/, '') // Remover timestamp del nombre
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
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          
          {uploading ? (
            <div className="space-y-2">
              <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-line border-t-[color:var(--signal)]" />
              <p className="text-[13px] text-muted-foreground">{t('common.uploadingFile')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {getFileIcon()}
              <div>
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-medium text-signal">{t('common.clickToUpload')}</span> {t('common.dragFileHere')}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {finalDescription}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current File Preview */}
        {value && (
          <div className="relative">
            <div className="rounded-[10px] border border-line bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-line bg-card">
                    {getFileIcon()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {getFileName()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {fileType === 'audio' ? t('common.audioFileLoaded') : t('common.videoFileLoaded')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="rounded-[6px] p-1.5 text-muted-foreground transition-colors hover:bg-[color:var(--danger)]/10 hover:text-[color:var(--danger)]"
                  title={t('common.removeFile')}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              
              {/* Media Preview */}
              <div className="mt-3">
                {fileType === 'audio' ? (
                  <audio controls className="w-full">
                    <source src={value} type="audio/mpeg" />
                    Tu navegador no soporta el elemento de audio.
                  </audio>
                ) : (
                  <video controls className="max-h-64 w-full rounded-control">
                    <source src={value} type="video/mp4" />
                    Tu navegador no soporta el elemento de video.
                  </video>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}