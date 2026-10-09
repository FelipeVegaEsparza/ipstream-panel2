'use client'

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

export type MediaUploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error'

interface QueueItem {
  id: string
  file: File
  status: MediaUploadStatus
  progress: number
  error?: string
  sizeLabel: string
}

interface Props {
  /** Valor del atributo `accept` del input (ej: "video/*", ".mp3,audio/mpeg") */
  accept: string
  /** Endpoint POST del panel que recibe el multipart */
  endpoint: string
  /** Texto bajo la zona de drop */
  hint?: string
  /** Texto principal de la zona de drop */
  dropTitle?: string
  /** Campos extra del multipart (ej: folderId) */
  extraFields?: () => Record<string, string>
  /** Validación opcional del archivo (mensaje en `invalidMessage` si falla) */
  validateFile?: (file: File) => boolean
  invalidMessage?: string
  /** Si se define, tras subir se consulta el estado hasta ready/error */
  statusUrl?: (trackId: string) => string
  /** Se llama cuando al menos un archivo terminó (ready/completado) */
  onUploaded?: () => void
}

let queueIdCounter = 0

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function uploadFile(
  url: string,
  file: File,
  extra: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    for (const [k, v] of Object.entries(extra)) form.append(k, v)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      let data: any = null
      try { data = JSON.parse(xhr.responseText) } catch { /* noop */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        reject(new Error(data?.message || data?.error || `HTTP ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Error de red'))
    xhr.onabort = () => reject(new Error('Cancelado'))

    xhr.open('POST', url)
    xhr.send(form)
  })
}

async function waitForReady(
  url: string,
  intervalMs = 3000,
  timeoutMs = 60 * 60 * 1000,
): Promise<{ status: string; processingError?: string | null }> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs))
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'ready' || data.status === 'error') return data
      }
    } catch { /* reintentar */ }
  }
  return { status: 'error', processingError: 'Tiempo de espera de procesamiento agotado' }
}

export function MediaUploader({
  accept,
  endpoint,
  hint,
  dropTitle,
  extraFields,
  validateFile,
  invalidMessage,
  statusUrl,
  onUploaded,
}: Props) {
  const { toast } = useToast()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const processQueue = useCallback(async () => {
    setIsProcessing(true)
    let successCount = 0
    let errorCount = 0

    for (const item of queue) {
      if (item.status !== 'pending') continue

      updateItem(item.id, { status: 'uploading', progress: 0 })

      try {
        const json = await uploadFile(endpoint, item.file, extraFields?.() || {}, (pct) => {
          updateItem(item.id, { progress: pct })
        })

        if (statusUrl) {
          const trackId = json?.track?.id
          if (trackId) {
            updateItem(item.id, { status: 'processing', progress: 100 })
            const result = await waitForReady(statusUrl(trackId))
            if (result.status === 'ready') {
              updateItem(item.id, { status: 'completed', progress: 100 })
              successCount++
            } else {
              throw new Error(result.processingError || 'Error al procesar el video')
            }
          } else {
            updateItem(item.id, { status: 'completed', progress: 100 })
            successCount++
          }
        } else {
          updateItem(item.id, { status: 'completed', progress: 100 })
          successCount++
        }
      } catch (err: any) {
        updateItem(item.id, { status: 'error', error: err.message })
        errorCount++
        toast({ type: 'error', title: `Error: ${item.file.name}`, description: err.message })
      }
    }

    setIsProcessing(false)

    if (successCount > 0) {
      onUploaded?.()
      toast({ type: 'success', title: `${successCount} archivo(s) procesado(s)` })
      setTimeout(() => setQueue([]), 4000)
    } else if (errorCount === 0) {
      setQueue([])
    }
  }, [queue, endpoint, extraFields, statusUrl, onUploaded, toast])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newItems: QueueItem[] = []
      let skipped = 0
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (validateFile && !validateFile(file)) {
          skipped++
          continue
        }
        newItems.push({
          id: `q_${++queueIdCounter}`,
          file,
          status: 'pending',
          progress: 0,
          sizeLabel: formatSize(file.size),
        })
      }

      if (skipped > 0) {
        toast({ type: 'info', title: `${skipped} archivo(s) omitido(s)`, description: invalidMessage })
      }
      if (newItems.length === 0) return

      setQueue((prev) => [...prev, ...newItems])
    },
    [validateFile, invalidMessage, toast],
  )

  const startUpload = () => {
    if (queue.length === 0 || isProcessing) return
    processQueue()
  }

  const statusIcon = (status: MediaUploadStatus) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-border" />
      case 'uploading':
      case 'processing':
        return (
          <svg className="animate-spin h-4 w-4 text-brand" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
    }
  }

  const hasPending = queue.some((item) => item.status === 'pending')
  const totalProgress = queue.length > 0
    ? Math.round(queue.reduce((sum, item) => sum + item.progress, 0) / queue.length)
    : 0
  const completedCount = queue.filter((item) => item.status === 'completed').length
  const totalCount = queue.length

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition
          ${dragOver ? 'border-brand bg-brand/10' : 'border-border hover:border-border'}
          ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-3xl mb-1">
          {isProcessing ? '⏳' : '⬆️'}
        </div>
        <div className="text-foreground font-medium text-sm">
          {dropTitle || 'Arrastra archivos aquí o haz clic para seleccionar'}
        </div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </div>

      {queue.length > 0 && (
        <div className="bg-card/80 rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Cola de subida ({completedCount}/{totalCount})
            </span>
            {hasPending && !isProcessing && (
              <button
                onClick={startUpload}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded"
              >
                Iniciar subida
              </button>
            )}
          </div>

          {isProcessing && (
            <div className="px-3 py-2 bg-background/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>Progreso total</span>
                <span className="ml-auto">{totalProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-shrink-0">{statusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground truncate">{item.file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{item.sizeLabel}</span>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="mt-1 w-full bg-secondary rounded-full h-1">
                      <div
                        className="bg-brand h-1 rounded-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && item.error && (
                    <div className="text-xs text-red-400 truncate mt-0.5">{item.error}</div>
                  )}
                  {item.status === 'pending' && (
                    <div className="text-xs text-muted-foreground mt-0.5">Pendiente</div>
                  )}
                  {item.status === 'processing' && (
                    <div className="text-xs text-brand mt-0.5">Procesando…</div>
                  )}
                  {item.status === 'completed' && (
                    <div className="text-xs text-green-400 mt-0.5">Completado</div>
                  )}
                </div>
                {item.status === 'uploading' && (
                  <span className="text-xs text-brand flex-shrink-0">{item.progress}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
