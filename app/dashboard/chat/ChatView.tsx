'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { StaffComposer } from './StaffComposer'
import { ChatThread } from './ChatThread'
import { BansPanel } from './BansPanel'
import { StatsCards, type ChatStats } from './StatsCards'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t } = useDashboardI18n()
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
      let cursor = lastSinceRef.current
      let nextCursor = cursor
      const collected: ChatMessage[] = []

      for (let batch = 0; batch < 10; batch += 1) {
        const url = cursor
          ? `/api/dashboard/chat/messages?since=${encodeURIComponent(cursor)}&limit=100`
          : `/api/dashboard/chat/messages?limit=50`

        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) {
          if (res.status === 403) setError(t('chat.disabled'))
          return
        }
        const data = await res.json()
        const newMsgs: ChatMessage[] = (data.messages || []).map((m: ChatMessage) => ({
          ...m,
          createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
        }))
        collected.push(...newMsgs)

        const responseCursor =
          typeof data.nextCursor === 'string' ? data.nextCursor : null
        const lastMessageCursor = newMsgs.length > 0
          ? newMsgs[newMsgs.length - 1].createdAt
          : null
        nextCursor = responseCursor ?? lastMessageCursor ?? cursor

        if (!data.hasMore || !nextCursor || nextCursor === cursor) break
        cursor = nextCursor
      }

      if (collected.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...prev]
          for (const m of collected) {
            if (!seen.has(m.id)) merged.push(m)
          }
          return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        })
      }
      lastSinceRef.current = nextCursor

      const statsRes = await fetch('/api/dashboard/chat/stats', { cache: 'no-store' })
      if (statsRes.ok) {
        const sd = await statsRes.json()
        if (sd.stats) setStats(sd.stats)
      }
      setError(null)
    } catch (err) {
      console.error('Chat poll error', err)
      setError(t('chat.connectionError'))
    }
  }, [t])

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
    setStats((s) => ({ ...s, lastHourMessages: s.lastHourMessages + 1, last24hMessages: s.last24hMessages + 1 }))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboard/chat/messages/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || t('chat.deleteError'))
      return false
    }
    setMessages((prev) => prev.filter((m) => m.id !== id))
    setStats((s) => ({ ...s, last24hMessages: Math.max(0, s.last24hMessages - 1) }))
    return true
  }, [t])

  const handleAddBan = useCallback(async (data: { email?: string; ipAddress?: string; reason?: string }) => {
    const res = await fetch('/api/dashboard/chat/bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || t('chat.banError'))
      return null
    }
    const json = await res.json()
    const ban: ChatBan = { ...json.ban, createdAt: json.ban.createdAt }
    setBans((prev) => [ban, ...prev])
    setStats((s) => ({ ...s, activeBans: s.activeBans + 1 }))
    return ban
  }, [t])

  const handleRemoveBan = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboard/chat/bans/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || t('chat.unbanError'))
      return false
    }
    setBans((prev) => prev.filter((b) => b.id !== id))
    setStats((s) => ({ ...s, activeBans: Math.max(0, s.activeBans - 1) }))
    return true
  }, [t])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MessagesSquare className="h-6 w-6 text-brand" />
            {t('chat.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('chat.subtitle')}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
          {t('chat.updating', { seconds: POLL_INTERVAL_MS / 1000 })}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex h-[calc(100vh-240px)] min-h-[440px] max-h-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft sm:min-h-[520px]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {t('chat.conversation')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t('chat.count', { count: messages.length })}
                </p>
              </div>
            </div>
          </div>

          <ChatThread messages={messages} onDelete={handleDelete} />
          <StaffComposer
            staffName={staffName}
            onSent={handleSent}
            onError={setError}
          />
        </section>

        <aside className="space-y-4">
          <StatsCards stats={stats} />
          <BansPanel
            bans={bans}
            onAdd={handleAddBan}
            onRemove={handleRemoveBan}
            onError={setError}
          />
        </aside>
      </div>
    </div>
  )
}
