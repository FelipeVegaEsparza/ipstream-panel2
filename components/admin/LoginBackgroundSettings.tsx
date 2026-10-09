'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Image as ImageIcon, X, RotateCcw, Upload, Loader2, Link as LinkIcon } from 'lucide-react'

interface LoginBackgroundSettingsProps {
  currentImage: string | null
}

export function LoginBackgroundSettings({ currentImage }: LoginBackgroundSettingsProps) {
  const [url, setUrl] = useState(currentImage ?? '')
  const [preview, setPreview] = useState<string | null>(currentImage)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )
  const [dragOver, setDragOver] = useState(false)
  const [mode, setMode] = useState<'upload' | 'url'>(currentImage?.startsWith('/api/uploads/login/') ? 'upload' : 'url')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUrlChange = (value: string) => {
    setUrl(value)
    if (value.trim()) {
      setPreview(value.trim())
    } else {
      setPreview(null)
    }
  }

  const saveImageUrl = async (imageUrl: string | null, successMessage: string) => {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/settings/login-background', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al guardar')
      }
      setFeedback({ type: 'success', message: successMessage })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveUrl = async () => {
    await saveImageUrl(url.trim() || null, 'Fondo del login actualizado')
  }

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'El archivo debe ser una imagen' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'La imagen supera el máximo de 10 MB' })
      return
    }

    setUploading(true)
    setFeedback(null)
    try {
      // Preview local inmediato
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/settings/login-background', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al subir la imagen')
      }

      const data = await res.json()
      setUrl(data.imageUrl ?? '')
      setPreview(data.imageUrl ?? null)
      setMode('upload')
      setFeedback({ type: 'success', message: 'Imagen subida y aplicada' })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al subir',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) uploadFile(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleReset = async () => {
    if (!confirm('¿Restaurar el fondo animado por defecto?')) return
    setUrl('')
    setPreview(null)
    await saveImageUrl(null, 'Fondo restaurado al predeterminado')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-brand" />
          Fondo de pantalla del login
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configura la imagen que verán los usuarios al iniciar sesión.
          Si no defines ninguna, se mostrará el fondo animado predeterminado.
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-secondary/40 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${
            mode === 'upload' ? 'bg-brand text-white' : 'text-muted-foreground hover:text-white'
          }`}
        >
          <Upload className="h-4 w-4" />
          Subir imagen
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition-colors ${
            mode === 'url' ? 'bg-brand text-white' : 'text-muted-foreground hover:text-white'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          URL externa
        </button>
      </div>

      {mode === 'upload' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-brand bg-brand/10'
                : 'border-border bg-card/40 hover:border-border hover:bg-card/60'
            } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 text-brand animate-spin" />
                <p className="text-foreground font-medium">Subiendo y procesando...</p>
                <p className="text-xs text-muted-foreground">Se optimizará automáticamente a WebP</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-foreground font-medium">
                  Arrastra una imagen aquí o haz click para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG o WebP · máximo 10 MB · se redimensiona a 1920px
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <label className="text-sm text-muted-foreground block mb-2">URL de la imagen</label>
          <input
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://ejemplo.com/fondo.jpg"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground placeholder-gray-500 focus:outline-none focus:border-brand"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Pega la URL pública de una imagen. Se recomienda al menos 1920×1080.
          </p>
          <div className="flex justify-end mt-3">
            <Button
              type="button"
              onClick={handleSaveUrl}
              disabled={saving || !url.trim()}
              className="bg-brand hover:bg-brand"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar URL'}
            </Button>
          </div>
        </div>
      )}

      {preview ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="aspect-video relative bg-background">
            <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-card/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-border">
                <p className="text-foreground text-sm font-medium">Vista previa del login</p>
                <p className="text-muted-foreground text-xs">El formulario se ve sobre tu imagen</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card/40">
          <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Sin imagen personalizada</p>
          <p className="text-muted-foreground text-xs">Se mostrará el fondo animado predeterminado</p>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button
          type="button"
          onClick={handleReset}
          disabled={saving || !currentImage}
          variant="outline"
          className="border-border hover:bg-secondary"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar predeterminado
        </Button>
      </div>
    </div>
  )
}
