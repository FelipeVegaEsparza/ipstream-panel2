'use client'

import { useEffect, useState, useCallback } from 'react'
import { showToast } from '@/components/ui/toast'

interface TimezoneSelectorProps {
  onChanged?: () => void
  compact?: boolean
}

function getAllTimezones(): string[] {
  try {
    const zones = (Intl as any).supportedValuesOf
      ? (Intl as any).supportedValuesOf('timeZone')
      : []
    if (Array.isArray(zones) && zones.length > 0) return zones as string[]
  } catch (_) { /* fallback abajo */ }

  return [
    'UTC',
    'America/Santiago',
    'America/Buenos_Aires',
    'America/Mexico_City',
    'America/Bogota',
    'America/Lima',
    'America/Caracas',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/Madrid',
    'Europe/London',
    'Europe/Paris',
    'Africa/Casablanca',
  ]
}

export default function TimezoneSelector({ onChanged, compact }: TimezoneSelectorProps) {
  const [timezone, setTimezone] = useState<string>('UTC')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [zones] = useState<string[]>(getAllTimezones)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/settings/timezone', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setTimezone(data.timezone || 'UTC')
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (value: string) => {
    if (value === timezone) return
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/settings/timezone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: value }),
      })
      if (res.ok) {
        setTimezone(value)
        showToast({ type: 'success', title: 'Zona horaria guardada' })
        showToast({ type: 'info', title: 'Las franjas existentes se reinterpretan en la nueva zona.' })
        onChanged?.()
      } else {
        const err = await res.json()
        showToast({ type: 'error', title: err.message || 'Error al guardar' })
        load()
      }
    } catch {
      showToast({ type: 'error', title: 'Error al guardar' })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'flex-col sm:flex-row'}`}>
      <label className="text-sm text-gray-400 whitespace-nowrap">Zona horaria</label>
      <select
        value={timezone}
        onChange={(e) => handleSave(e.target.value)}
        disabled={loading || saving}
        className="form-input text-sm"
      >
        {loading && <option value="">Cargando...</option>}
        {zones.map((z) => (
          <option key={z} value={z}>{z}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-gray-500">Guardando...</span>}
    </div>
  )
}
