import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError, getChatMessages, getChatOnline, sendChatMessage } from '@/core/api'
import type { ChatMessage } from '@/core/types'
import { useTenant } from '@/core/config/TenantContext'
import { Section } from '@/ui'
import styles from './ChatSection.module.css'

const NAME_KEY = 'ipstream_chat_name'
const MAX_MESSAGES = 100
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set(prev.map((message) => message.id))
  const merged = [...prev]
  for (const message of incoming) {
    if (!seen.has(message.id)) {
      seen.add(message.id)
      merged.push(message)
    }
  }
  return merged.slice(-MAX_MESSAGES)
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

interface ChatSectionProps {
  embedded?: boolean
  onNewMessages?: (count: number) => void
}

export function ChatSection({ embedded = false, onNewMessages }: ChatSectionProps) {
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const cursorRef = useRef<string | null>(null)
  const hasLoadedRef = useRef(false)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const listRef = useRef<HTMLUListElement>(null)
  const stickToBottomRef = useRef(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '')
  const [email, setEmail] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [validation, setValidation] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const messagesQuery = useQuery({
    queryKey: ['chat', clientId],
    queryFn: async () => {
      const collected: ChatMessage[] = []
      let cursor = cursorRef.current
      let nextCursor = cursor

      for (let batch = 0; batch < 10; batch += 1) {
        const data = await getChatMessages(clientId!, cursor ?? undefined)
        collected.push(...data.messages)
        nextCursor =
          data.nextCursor ??
          (data.messages.length > 0
            ? data.messages[data.messages.length - 1].createdAt
            : cursor)
        if (!data.hasMore || !nextCursor || nextCursor === cursor) break
        cursor = nextCursor
      }

      return { messages: collected, nextCursor }
    },
    enabled: Boolean(clientId),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: 1
  })
  const { data: chatData, refetch: chatRefetch } = messagesQuery

  useEffect(() => {
    if (!chatData) return

    let newCount = 0
    for (const message of chatData.messages) {
      if (!knownIdsRef.current.has(message.id)) {
        knownIdsRef.current.add(message.id)
        newCount += 1
      }
    }

    setMessages((prev) => mergeMessages(prev, chatData.messages))
    cursorRef.current = chatData.nextCursor

    if (hasLoadedRef.current && newCount > 0) onNewMessages?.(newCount)
    hasLoadedRef.current = true
  }, [chatData, onNewMessages])

  // Autoscroll: seguir el hilo salvo que el usuario haya subido a leer.
  useEffect(() => {
    const list = listRef.current
    if (!list || !stickToBottomRef.current) return
    list.scrollTop = list.scrollHeight
  }, [messages])

  const onlineQuery = useQuery({
    queryKey: ['chatOnline', clientId],
    queryFn: () => getChatOnline(clientId!),
    enabled: Boolean(clientId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1
  })

  const handleSend = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      setValidation(null)
      setSendError(null)

      if (!clientId) return
      if (!name.trim() || !email.trim() || !body.trim()) {
        setValidation('Ingresa tu nombre, un email válido y un mensaje.')
        return
      }
      if (name.trim().length < 2) {
        setValidation('El nombre debe tener al menos 2 caracteres.')
        return
      }
      if (!EMAIL_RE.test(email.trim())) {
        setValidation('Ingresa un email válido.')
        return
      }

      setSending(true)
      try {
        const sent = await sendChatMessage(clientId, {
          name: name.trim(),
          email: email.trim(),
          body: body.trim()
        })
        knownIdsRef.current.add(sent.id)
        localStorage.setItem(NAME_KEY, name.trim())
        setBody('')
        stickToBottomRef.current = true
        void chatRefetch()
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 0
        if (status === 429) {
          setSendError('Demasiados mensajes. Espera un momento antes de reintentar.')
        } else if (status === 403) {
          setSendError('No puedes escribir en este chat.')
        } else {
          setSendError('No se pudo enviar el mensaje. Intenta de nuevo.')
        }
      } finally {
        setSending(false)
      }
    },
    [clientId, name, email, body, chatRefetch]
  )

  const content = (
    <div className={styles.chat}>
      <div className={styles.header}>
        <span className={styles.online}>
          {onlineQuery.data ? `${onlineQuery.data.count} oyentes activos` : 'Chat'}
        </span>
      </div>

      <ul
        ref={listRef}
        className={styles.list}
        aria-live="polite"
        onScroll={() => {
          const list = listRef.current
          if (!list) return
          stickToBottomRef.current =
            list.scrollHeight - list.scrollTop - list.clientHeight < 80
        }}
      >
        {messages.map((message) => (
          <li
            key={message.id}
            className={message.authorType === 'staff' ? styles.admin : styles.listener}
          >
            <span className={styles.msgName}>{message.name}</span>
            <span className={styles.msgBody}>{message.body}</span>
            <span className={styles.msgTime}>{formatTime(message.createdAt)}</span>
          </li>
        ))}
        {messages.length === 0 && !messagesQuery.isLoading && (
          <li className={styles.empty}>Sé el primero en escribir…</li>
        )}
      </ul>

      <form className={styles.form} onSubmit={handleSend}>
        <div className={styles.fields}>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
            aria-label="Nombre"
            maxLength={60}
          />
          <input
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            aria-label="Email"
            maxLength={120}
          />
        </div>
        <div className={styles.row}>
          <textarea
            className={styles.textarea}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje"
            maxLength={500}
            rows={2}
          />
          <button type="submit" className={styles.send} disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
        {validation && <p className={styles.error}>{validation}</p>}
        {sendError && <p className={styles.error}>{sendError}</p>}
      </form>
    </div>
  )

  if (embedded) return content

  return (
    <Section title="Chat en vivo" visible loading={false}>
      {content}
    </Section>
  )
}
