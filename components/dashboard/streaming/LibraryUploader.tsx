'use client'

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

interface Props {
  onUploaded: () => void
}

type FileStatus = 'pending' | 'uploading' | 'completed' | 'error'

interface QueueItem {
  id: string
  file: File
  status: FileStatus
  progress: number
  error?: string
  sizeLabel: string
}

let queueIdCounter = 0

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function uploadFile(file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        try {
          const data = JSON.parse(xhr.responseText)
          reject(new Error(data?.message || `HTTP ${xhr.status}`))
        } catch {
          reject(new Error(`HTTP ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('Error de red'))
    xhr.onabort = () => reject(new Error('Cancelado'))

    xhr.open('POST', '/api/dashboard/streaming/library')
    xhr.send(form)
  })
}

export function LibraryUploader({ onUploaded }: Props) {
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
        await uploadFile(item.file, (pct) => {
          updateItem(item.id, { progress: pct })
        })
        updateItem(item.id, { status: 'completed', progress: 100 })
        successCount++
      } catch (err: any) {
        updateItem(item.id, { status: 'error', error: err.message })
        errorCount++
        toast({ type: 'error', title: `Error: ${item.file.name}`, description: err.message })
      }
    }

    setIsProcessing(false)

    if (successCount > 0) {
      onUploaded()
      toast({ type: 'success', title: `${successCount} archivo(s) subido(s)` })

      setTimeout(() => {
        setQueue([])
      }, 4000)
    } else if (errorCount === 0) {
      toast({ type: 'info', title: 'No se subieron archivos', description: 'Solo se aceptan .mp3' })
      setQueue([])
    }
  }, [queue, onUploaded, toast])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newItems: QueueItem[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.name.toLowerCase().endsWith('.mp3')) {
          console.warn('Skipping non-MP3:', file.name)
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

      if (newItems.length === 0) return

      setQueue((prev) => [...prev, ...newItems])
    },
    []
  )

  const startUpload = () => {
    if (queue.length === 0 || isProcessing) return
    processQueue()
  }

  const statusIcon = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-gray-500" />
      case 'uploading':
        return (
          <svg className="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24">
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
      {/* Drop zone */}
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
          ${dragOver ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600 hover:border-gray-500'}
          ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
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
        <div className="text-3xl mb-1">
          {isProcessing ? '⏳' : '⬆️'}
        </div>
        <div className="text-white font-medium text-sm">
          Arrastrá MP3s acá o hacé click para seleccionar
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Máximo 50MB por archivo. Solo .mp3
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-300">
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

          {/* Overall progress bar (when uploading) */}
          {isProcessing && (
            <div className="px-3 py-2 bg-gray-900/50">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span>Progreso total</span>
                <span className="ml-auto">{totalProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* File items */}
          <div className="divide-y divide-gray-700/50 max-h-64 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-shrink-0">{statusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white truncate">{item.file.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{item.sizeLabel}</span>
                  </div>
                  {/* Progress bar for uploading */}
                  {item.status === 'uploading' && (
                    <div className="mt-1 w-full bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-cyan-500 h-1 rounded-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {/* Error message */}
                  {item.status === 'error' && item.error && (
                    <div className="text-xs text-red-400 truncate mt-0.5">{item.error}</div>
                  )}
                  {/* Status label */}
                  {item.status === 'pending' && (
                    <div className="text-xs text-gray-500 mt-0.5">Pendiente</div>
                  )}
                  {item.status === 'completed' && (
                    <div className="text-xs text-green-400 mt-0.5">Completado</div>
                  )}
                </div>
                {/* Progress percentage for uploading */}
                {item.status === 'uploading' && (
                  <span className="text-xs text-cyan-400 flex-shrink-0">{item.progress}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
