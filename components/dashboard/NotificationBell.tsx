'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellIcon } from '@heroicons/react/24/outline'

interface PanelNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<PanelNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard/notifications?limit=30', {
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
      setUnread(typeof data.unread === 'number' ? data.unread : 0)
    } catch {
      // Sin sesión o error: no se muestra la campana con datos.
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function markRead(notification: PanelNotification) {
    if (notification.readAt) return
    setLoading(true)
    try {
      await fetch('/api/dashboard/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notification.id }),
      })
      setItems((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
        )
      )
      setUnread((value) => Math.max(0, value - 1))
    } finally {
      setLoading(false)
    }
  }

  async function markAll() {
    setLoading(true)
    try {
      await fetch('/api/dashboard/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
      setUnread(0)
    } finally {
      setLoading(false)
    }
  }

  function openNotification(notification: PanelNotification) {
    markRead(notification)
    if (notification.link) {
      setOpen(false)
      router.push(notification.link)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <BellIcon className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[12px] font-medium text-foreground">Notificaciones</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={loading}
                className="text-[11px] text-brand hover:underline disabled:opacity-50"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
                No tienes notificaciones.
              </p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`block w-full border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-secondary ${
                    notification.readAt ? 'opacity-70' : ''
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!notification.readAt && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-foreground">
                        {notification.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted-foreground/80">
                        {new Date(notification.createdAt).toLocaleString('es-CL', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
