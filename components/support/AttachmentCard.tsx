'use client'

import { useState } from 'react'
import { Download, ExternalLink, X } from 'lucide-react'
import {
  getFileIcon,
  isPreviewableImage,
  formatFileSize,
} from '@/lib/ticket-attachments'

export interface SupportAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  createdAt: string | Date
}

interface AttachmentCardProps {
  attachment: SupportAttachment
  onRemove?: (id: string) => void
}

export function AttachmentCard({ attachment, onRemove }: AttachmentCardProps) {
  const [imgError, setImgError] = useState(false)
  const isImage = isPreviewableImage(attachment.mimeType) && !imgError
  const Icon = getFileIcon(attachment.mimeType)

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/60 border border-gray-700 hover:border-gray-600 transition-colors group">
      {isImage ? (
        <a
          href={attachment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName}
            className="w-12 h-12 object-cover rounded"
            onError={() => setImgError(true)}
          />
        </a>
      ) : (
        <div className="flex-shrink-0 w-12 h-12 rounded bg-gray-700/60 flex items-center justify-center">
          <Icon className="h-6 w-6 text-cyan-400" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <a
          href={attachment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white hover:text-cyan-300 transition-colors truncate flex items-center gap-1"
        >
          {attachment.fileName}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
        <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
      </div>

      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="flex-shrink-0 p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        title="Descargar"
      >
        <Download className="h-4 w-4" />
      </a>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="flex-shrink-0 p-1.5 rounded hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"
          title="Quitar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
