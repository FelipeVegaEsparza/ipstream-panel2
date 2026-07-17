'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, X, Loader2, AlertCircle } from 'lucide-react'
import {
  isAllowedMimeType,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  formatFileSize,
} from '@/lib/ticket-attachments'
import type { SupportAttachment } from './AttachmentCard'
import { AttachmentCard } from './AttachmentCard'

interface AttachmentUploaderProps {
  ticketId: string
  endpoint: string
  pending: SupportAttachment[]
  onChange: (attachments: SupportAttachment[]) => void
  disabled?: boolean
}

export function AttachmentUploader({
  ticketId,
  endpoint,
  pending,
  onChange,
  disabled,
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (disabled) return
      if (pending.length + files.length > MAX_FILES_PER_MESSAGE) {
        setError(`Máximo ${MAX_FILES_PER_MESSAGE} archivos por mensaje`)
        return
      }

      setError(null)
      setUploading(true)
      const uploaded: SupportAttachment[] = []
      for (const file of files) {
        if (!isAllowedMimeType(file.type)) {
          setError(`Tipo no permitido: ${file.name}`)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`"${file.name}" supera el máximo de 10 MB`)
          continue
        }
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch(`${endpoint}/${ticketId}/attachments`, {
            method: 'POST',
            body: fd,
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || 'Error al subir')
          }
          const data = await res.json()
          uploaded.push(data.attachment)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al subir')
        }
      }
      onChange([...pending, ...uploaded])
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [ticketId, endpoint, pending, onChange, disabled]
  )

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) uploadFiles(files)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled) return
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) uploadFiles(files)
    },
    [uploadFiles, disabled]
  )

  const handleRemove = (id: string) => {
    onChange(pending.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={[
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.ppt',
            '.pptx',
            '.txt',
            '.csv',
          ].join(',')}
          onChange={handleSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || pending.length >= MAX_FILES_PER_MESSAGE}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Paperclip className="h-3 w-3" />
          )}
          Adjuntar
        </button>
        <span className="text-xs text-gray-500">
          {pending.length}/{MAX_FILES_PER_MESSAGE} archivos · máx 10 MB c/u
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {error}
          <button onClick={() => setError(null)} className="ml-1 hover:text-red-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-1.5">
          {pending.map((a) => (
            <AttachmentCard
              key={a.id}
              attachment={a}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}
