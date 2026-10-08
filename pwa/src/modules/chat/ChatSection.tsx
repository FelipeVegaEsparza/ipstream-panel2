import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getChatMessages, getChatOnline, sendChatMessage } from '@/core/api'
import type { ChatMessage } from '@/core/types'
import { useTenant } from '@/core/config/TenantContext'
import { Section } from '@/ui'
import styles from './ChatSection.module.css'

const NAME_KEY = 'ipstream_chat_name'
const MAX_MESSAGES = 100

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

export function ChatSection() {
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const serverTimeRef = useRef<string | null>(null)
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
    queryFn: () => getChatMessages(clientId!, serverTimeRef.current ?? undefined),
    enabled: Boolean(clientId),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: 1
  })
  const { data: chatData, refetch: chatRefetch } = messagesQuery

  useEffect(() => {
    if (!chatData) return
    const previousSince = serverTimeRef.current
    setMessages((prev) => mergeMessages(prev, chatData.messages))
    serverTimeRef.current = chatData.serverTime
    // Si vienen exactamente tantos mensajes como el límite, puede haber un
    // hueco (pestaña en segundo plano o más de `limit` mensajes): realinear
    // el cursor pidiendo desde el principio una sola vez.
    if (
      previousSince !== null &&
      chatData.messages.length >= 50 &&
      chatData.serverTime !== previousSince
    ) {
      serverTimeRef.current = null
      void chatRefetch()
    }
  }, [chatData, chatRefetch])

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

      if (!name.trim() || !body.trim()) {
        setValidation('Ingresa tu nombre y un mensaje.')
        return
      }

      setSending(true)
      try {
        await sendChatMessage(clientId!, {
          name: name.trim(),
          email: email.trim() || null,
          body: body.trim()
        })
        localStorage.setItem(NAME_KEY, name.trim())
        setBody('')
        stickToBottomRef.current = true
        void chatRefetch()
      } catch {
        setSendError('No se pudo enviar el mensaje. Intenta de nuevo (límite: 5 por minuto).')
      } finally {
        setSending(false)
      }
    },
    [clientId, name, email, body, chatRefetch]
  )

  return (
    <Section title="Chat en vivo" visible loading={false}>
      <div className={styles.chat}>
        <div className={styles.header}>
          <span className={styles.online}>
            {onlineQuery.data ? `${onlineQuery.data.count} oyentes activos` : 'Chat'}
          </span>
        </div>

        <ul
          ref={listRef}
          className={styles.list}
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
              className={message.authorType === 'admin' ? styles.admin : styles.listener}
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
            />
            <input
              className={styles.input}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email (opcional)"
              type="email"
              aria-label="Email"
            />
          </div>
          <div className={styles.row}>
            <textarea
              className={styles.textarea}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Escribe un mensaje…"
              aria-label="Mensaje"
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
    </Section>
  )
}
