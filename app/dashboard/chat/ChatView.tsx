'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { StaffComposer } from './StaffComposer'
import { MessagesTable } from './MessagesTable'
import { BansPanel } from './BansPanel'
import { StatsCards, type ChatStats } from './StatsCards'

export interface ChatMessage {
  id: string
  authorType: string
  name: string
  body: string
  email: string | null
  ipAddress: string | null
  createdAt: string
}

export interface ChatBan {
  id: string
  clientId: string
  email: string | null
  ipAddress: string | null
  reason: string | null
  createdAt: string
}

interface ChatViewProps {
  staffName: string
  initialMessages: ChatMessage[]
  initialBans: ChatBan[]
  initialStats: ChatStats
}

const POLL_INTERVAL_MS = 3000

export function ChatView({ staffName, initialMessages, initialBans, initialStats }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    [...initialMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  )
  const [bans, setBans] = useState<ChatBan[]>(initialBans)
  const [stats, setStats] = useState<ChatStats>(initialStats)
  const [error, setError] = useState<string | null>(null)
  const lastSinceRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const since = lastSinceRef.current
      const url = since
        ? `/api/dashboard/chat/messages?since=${encodeURIComponent(since)}&limit=100`
        : `/api/dashboard/chat/messages?limit=50`

      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const newMsgs: ChatMessage[] = (data.messages || []).map((m: ChatMessage) => ({
        ...m,
        createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
      }))

      if (newMsgs.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...prev]
          for (const m of newMsgs) {
            if (!seen.has(m.id)) merged.push(m)
          }
          return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        })
        lastSinceRef.current = newMsgs[newMsgs.length - 1].createdAt
      } else if (!since) {
        // Sin cursor: no había mensajes. Pedimos el más reciente solo para fijar el cursor
        const tail = await fetch(`/api/dashboard/chat/messages?limit=1`, { cache: 'no-store' })
        if (tail.ok) {
          const d = await tail.json()
          const newest = d.messages?.[0]
          if (newest?.createdAt) {
            lastSinceRef.current = newest.createdAt
          }
        }
      }

      // Refrescar stats en paralelo
      const statsRes = await fetch('/api/dashboard/chat/stats', { cache: 'no-store' })
      if (statsRes.ok) {
        const sd = await statsRes.json()
        if (sd.stats) setStats(sd.stats)
      }
      setError(null)
    } catch (err) {
      console.error('Chat poll error', err)
      setError('Error de conexión. Reintentando…')
    }
  }, [])

  useEffect(() => {
    if (initialMessages.length > 0) {
      const sorted = [...initialMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const last = sorted[sorted.length - 1]
      lastSinceRef.current = last.createdAt
    }
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSent = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    })
    lastSinceRef.current = msg.createdAt
    setStats((s) => ({ ...s, lastHourMessages: s.lastHourMessages + 1, last24hMessages: s.last24hMessages + 1 }))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboard/chat/messages/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'No se pudo borrar')
      return false
    }
    setMessages((prev) => prev.filter((m) => m.id !== id))
    setStats((s) => ({ ...s, last24hMessages: Math.max(0, s.last24hMessages - 1) }))
    return true
  }, [])

  const handleAddBan = useCallback(async (data: { email?: string; ipAddress?: string; reason?: string }) => {
    const res = await fetch('/api/dashboard/chat/bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'No se pudo crear el ban')
      return null
    }
    const json = await res.json()
    const ban: ChatBan = { ...json.ban, createdAt: json.ban.createdAt }
    setBans((prev) => [ban, ...prev])
    setStats((s) => ({ ...s, activeBans: s.activeBans + 1 }))
    return ban
  }, [])

  const handleRemoveBan = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboard/chat/bans/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'No se pudo quitar el ban')
      return false
    }
    setBans((prev) => prev.filter((b) => b.id !== id))
    setStats((s) => ({ ...s, activeBans: Math.max(0, s.activeBans - 1) }))
    return true
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessagesSquare className="h-6 w-6 text-cyan-400" />
            Chat en Vivo
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Moderá el chat de tu radio y participá como staff
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Actualizando cada {POLL_INTERVAL_MS / 1000}s
        </div>
      </div>

      <StatsCards stats={stats} />

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <StaffComposer staffName={staffName} onSent={handleSent} onError={setError} />
          <MessagesTable messages={messages} onDelete={handleDelete} />
        </div>
        <div className="lg:col-span-1">
          <BansPanel bans={bans} onAdd={handleAddBan} onRemove={handleRemoveBan} onError={setError} />
        </div>
      </div>
    </div>
  )
}
