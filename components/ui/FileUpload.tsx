'use client'

import { useState, useRef } from 'react'
import { DocumentIcon, XMarkIcon, MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/toast'

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
  label = "Archivo",
  description = "Sube un archivo",
  className = ""
}: FileUploadProps) {
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
        toast({ type: 'error', title: error.error || 'Error al subir el archivo' })
      }
    } catch (error) {
      toast({ type: 'error', title: 'Error al subir el archivo' })
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
      return <MusicalNoteIcon className="h-12 w-12 text-gray-400 mx-auto" />
    } else {
      return <VideoCameraIcon className="h-12 w-12 text-gray-400 mx-auto" />
    }
  }

  const getFileName = () => {
    if (!value) return null
    return value.split('/').pop()?.replace(/^\d+_/, '') // Remover timestamp del nombre
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
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          
          {uploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto"></div>
              <p className="text-sm text-gray-300">Subiendo archivo...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFileIcon()}
              <div>
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-cyan-400">Haz clic para subir</span> o arrastra un archivo aquí
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current File Preview */}
        {value && (
          <div className="relative">
            <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {fileType === 'audio' ? '🎵' : '🎥'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {getFileName()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Archivo {fileType === 'audio' ? 'de audio' : 'de video'} cargado
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="p-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-lg hover:scale-110"
                  title="Eliminar archivo"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              
              {/* Media Preview */}
              <div className="mt-4">
                {fileType === 'audio' ? (
                  <audio controls className="w-full">
                    <source src={value} type="audio/mpeg" />
                    Tu navegador no soporta el elemento de audio.
                  </audio>
                ) : (
                  <video controls className="w-full max-h-64 rounded-lg">
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