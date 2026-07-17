import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileType,
  Film,
  Music,
  Archive,
  Paperclip,
  type LucideIcon,
} from 'lucide-react'

export const ALLOWED_MIME_TYPES = [
  // Imágenes
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // PDF
  'application/pdf',
  // Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Texto
  'text/plain',
  'text/csv',
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const MAX_FILES_PER_MESSAGE = 5

export function isAllowedMimeType(mime: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

export function getFileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.startsWith('text/')) return FileType
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.startsWith('audio/')) return Music
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return Archive
  if (
    mimeType.includes('word') ||
    mimeType.includes('officedocument')
  )
    return FileText
  return Paperclip
}

export function isPreviewableImage(mimeType: string): boolean {
  return mimeType.startsWith('image/') && mimeType !== 'image/gif'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
