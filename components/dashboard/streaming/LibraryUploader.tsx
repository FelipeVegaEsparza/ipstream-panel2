'use client'

// =====================================================
// LibraryUploader — drag&drop de MP3
// =====================================================

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

interface Props {
  onUploaded: () => void
}

export function LibraryUploader({ onUploaded }: Props) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      setUploading(true)
      setProgress(0)
      let successCount = 0
      let errorCount = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.name.toLowerCase().endsWith('.mp3')) {
          console.warn('Skipping non-MP3:', file.name)
          continue
        }
        try {
          const form = new FormData()
          form.append('file', file)
          const res = await fetch('/api/dashboard/streaming/library', {
            method: 'POST',
            body: form,
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data?.message || `HTTP ${res.status}`)
          }
          successCount++
        } catch (err: any) {
          console.error('Upload error:', err)
          errorCount++
          toast({ type: 'error', title: `Error subiendo ${file.name}`, description: err.message })
        }
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      setUploading(false)
      if (successCount > 0) {
        onUploaded()
        toast({ type: 'success', title: `${successCount} archivo(s) subido(s)` })
      } else if (errorCount === 0) {
        toast({ type: 'info', title: 'No se subieron archivos', description: 'Solo se aceptan .mp3' })
      }
    },
    [onUploaded, toast]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
        ${dragOver ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'}
        ${uploading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,audio/mpeg"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="text-4xl mb-2">⬆️</div>
      <div className="text-white font-medium">
        {uploading ? `Subiendo... ${progress}%` : 'Arrastrá MP3s acá o hacé click para seleccionar'}
      </div>
      <div className="text-sm text-gray-400 mt-1">
        Máximo 50MB por archivo. Solo .mp3
      </div>
    </div>
  )
}
