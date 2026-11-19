'use client'

import { showToast } from '@/components/ui/toast'

import { useEffect, useState, useCallback } from 'react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { parseClock, slotDays } from '@/lib/schedule-window'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
// Orden de presentación: lunes primero, domingo al final.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

interface Playlist {
  id: string
  name: string
  trackCount: number
}

interface ScheduleSlot {
  id: string
  dayOfWeek: number
  daysOfWeek?: string | null
  startTime: string
  endTime: string
  isActive: boolean
  playlistId: string
  playlistName: string
  playlistTrackCount: number
}

interface CurrentSlot {
  id: string
  playlistId: string
  playlistName: string
  dayOfWeek: number
  daysOfWeek?: string | null
  startTime: string
  endTime: string
}

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export default function SchedulePage() {
  const { t, locale } = useDashboardI18n()
  const days = locale === 'en' ? DAYS_EN : DAYS
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSlot, setCurrentSlot] = useState<CurrentSlot | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formPlaylistId, setFormPlaylistId] = useState('')
  const [formDays, setFormDays] = useState<number[]>([1])
  const [formStartTime, setFormStartTime] = useState('08:00')
  const [formEndTime, setFormEndTime] = useState('09:00')
  const [formSaving, setFormSaving] = useState(false)
  const [timezone, setTimezone] = useState('UTC')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [sRes, pRes, cRes, tzRes] = await Promise.all([
        fetch('/api/dashboard/streaming/schedule', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/playlists', { cache: 'no-store' }),
        fetch('/api/dashboard/streaming/schedule/current', { cache: 'no-store' }),
        fetch('/api/dashboard/settings/timezone', { cache: 'no-store' }),
      ])
      if (sRes.ok) {
        const data = await sRes.json()
        setSchedules(data.schedules || [])
      }
      if (pRes.ok) {
        const data = await pRes.json()
        setPlaylists(data.playlists || [])
      }
      if (cRes.ok) {
        const data = await cRes.json()
        setCurrentSlot(data.current)
      }
      if (tzRes.ok) {
        const data = await tzRes.json()
        setTimezone(data.timezone || 'UTC')
      }
    } catch (err) {
      console.error('Error loading schedule data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditId(null)
    setFormPlaylistId(playlists[0]?.id || '')
    setFormDays([1])
    setFormStartTime('08:00')
    setFormEndTime('09:00')
    setShowModal(true)
  }

  const openEdit = (slot: ScheduleSlot) => {
    setEditId(slot.id)
    setFormPlaylistId(slot.playlistId)
    setFormDays(slotDays(slot))
    setFormStartTime(slot.startTime)
    setFormEndTime(slot.endTime)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formPlaylistId || formDays.length === 0 || !formStartTime || !formEndTime) return
    setFormSaving(true)
    try {
      const body = {
        playlistId: formPlaylistId,
        daysOfWeek: formDays,
        dayOfWeek: formDays[0],
        startTime: formStartTime,
        endTime: formEndTime,
      }
      let res
      if (editId) {
        res = await fetch(`/api/dashboard/streaming/schedule/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/dashboard/streaming/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      if (res.ok) {
        setShowModal(false)
        load()
      } else {
        const err = await res.json()
        showToast({ type: 'error', title: err.message || t('streaming.schedule.errorSave') })
      }
    } catch {
      showToast({ type: 'error', title: t('streaming.schedule.errorSave') })
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('streaming.schedule.confirmDelete'))) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/streaming/schedule/${id}`, { method: 'DELETE' })
      if (res.ok) {
        load()
      } else {
        showToast({ type: 'error', title: t('streaming.schedule.errorDelete') })
      }
    } catch {
      showToast({ type: 'error', title: t('streaming.schedule.errorDelete') })
    } finally {
      setDeletingId(null)
    }
  }

  const isNow = (slot: ScheduleSlot) =>
    currentSlot?.id === slot.id

  const dayOrder = (slot: ScheduleSlot) => {
    const indexes = slotDays(slot)
      .map((day) => DAY_ORDER.indexOf(day))
      .filter((index) => index >= 0)
    return indexes.length ? Math.min(...indexes) : 99
  }

  const sortedSchedules = [...schedules].sort((a, b) => {
    const byDay = dayOrder(a) - dayOrder(b)
    return byDay !== 0 ? byDay : a.startTime.localeCompare(b.startTime)
  })

  const daysLabel = (slot: ScheduleSlot) => {
    const selected = new Set(slotDays(slot))
    if (selected.size === 7) return t('streaming.schedule.allDays')
    const ordered = DAY_ORDER.filter((day) => selected.has(day))
    const contiguous = ordered.every(
      (day, index) => index === 0 || DAY_ORDER.indexOf(day) === DAY_ORDER.indexOf(ordered[index - 1]) + 1
    )
    if (ordered.length > 2 && contiguous) {
      return `${days[ordered[0]]} – ${days[ordered[ordered.length - 1]]}`
    }
    return ordered.map((day) => days[day]).join(', ')
  }

  const crossesMidnight = (slot: ScheduleSlot) =>
    parseClock(slot.endTime) <= parseClock(slot.startTime)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('streaming.schedule.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('streaming.schedule.subtitle')}
            <span className="ml-2 text-xs text-muted-foreground">{t('streaming.schedule.timezone', { timezone })}</span>
            {currentSlot && (
              <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-brand/20 text-brand border border-brand/30">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                {t('streaming.schedule.now', { name: currentSlot.playlistName, start: fmtTime(currentSlot.startTime), end: fmtTime(currentSlot.endTime) })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={openCreate} className="btn-primary">
            {t('streaming.schedule.add')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('streaming.schedule.loading')}</div>
      ) : schedules.length === 0 ? (
    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-panel">
          <p className="text-lg mb-2">{t('streaming.schedule.emptyTitle')}</p>
          <p className="text-sm">{t('streaming.schedule.emptyText')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium w-48">{t('streaming.schedule.days')}</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium w-28">{t('streaming.schedule.start')}</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium w-36">{t('streaming.schedule.end')}</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">{t('streaming.schedule.playlist')}</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-medium w-24">{t('streaming.schedule.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedSchedules.map((slot) => {
                const now = isNow(slot)
                const overnight = crossesMidnight(slot)
                return (
                  <tr
                    key={slot.id}
                    className={`border-b border-border/50 transition-colors ${
                      now ? 'bg-brand/10' : 'hover:bg-card/30'
                    }`}
                  >
                    <td className={`py-3 px-4 font-medium ${now ? 'text-brand' : 'text-muted-foreground'}`}>
                      {daysLabel(slot)}
                    </td>
                    <td className={`py-3 px-4 ${now ? 'text-brand' : 'text-muted-foreground'}`}>
                      {fmtTime(slot.startTime)}
                    </td>
                    <td className={`py-3 px-4 ${now ? 'text-brand' : 'text-muted-foreground'}`}>
                      <span>{fmtTime(slot.endTime)}</span>
                      {overnight && (
                        <span className="ml-2 inline-flex rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          {t('streaming.schedule.overnight')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {now && (
                          <span className="w-2 h-2 rounded-full bg-brand animate-pulse shrink-0" />
                        )}
                        <span className={now ? 'text-brand font-medium' : 'text-muted-foreground'}>
                          {slot.playlistName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('streaming.schedule.tracks', { count: slot.playlistTrackCount })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(slot)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary text-muted-foreground transition-colors"
                        >
                          {t('streaming.schedule.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(slot.id)}
                          disabled={deletingId === slot.id}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 transition-colors disabled:opacity-50"
                        >
                          {deletingId === slot.id ? '...' : t('streaming.schedule.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
     <div className="bg-card rounded-container w-full max-w-md p-6 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editId ? t('streaming.schedule.editTitle') : t('streaming.schedule.newTitle')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Playlist</label>
                <select
                  value={formPlaylistId}
                  onChange={(e) => setFormPlaylistId(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">{t('streaming.schedule.select')}</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({t('streaming.schedule.tracks', { count: p.trackCount })})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t('streaming.schedule.days')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {DAY_ORDER.map((dayIdx) => {
                    const checked = formDays.includes(dayIdx)
                    return (
                      <label
                        key={dayIdx}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? 'border-brand/40 bg-brand/10 text-foreground'
                            : 'border-border text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setFormDays((prev) =>
                              event.target.checked
                                ? Array.from(new Set([...prev, dayIdx])).sort((a, b) => a - b)
                                : prev.filter((day) => day !== dayIdx)
                            )
                          }
                          className="rounded border-border bg-secondary"
                        />
                        {days[dayIdx]}
                      </label>
                    )
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('streaming.schedule.daysHint')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('common.start')}</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">{t('common.end')}</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('streaming.schedule.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={formSaving || !formPlaylistId || formDays.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                {formSaving ? t('streaming.schedule.saving') : editId ? t('streaming.schedule.saveChanges') : t('streaming.schedule.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
