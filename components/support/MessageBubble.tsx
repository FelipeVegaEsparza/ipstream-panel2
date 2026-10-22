'use client'

import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { LifeBuoy } from 'lucide-react'
import { AttachmentCard, type SupportAttachment } from './AttachmentCard'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export interface SupportMessage {
  id: string
  body: string
  authorType: string
  authorName: string
  createdAt: string | Date
  attachments?: SupportAttachment[]
}

interface MessageBubbleProps {
  message: SupportMessage
  showAuthor?: boolean
}

export function MessageBubble({ message, showAuthor = true }: MessageBubbleProps) {
  const { t, locale } = useDashboardI18n()
  const isClient = message.authorType === 'client'
  const isAdmin = message.authorType === 'admin'

  const dateValue = typeof message.createdAt === 'string'
    ? new Date(message.createdAt)
    : message.createdAt
  const timeAgo = formatDistanceToNow(dateValue, {
    addSuffix: true,
    locale: locale === 'en' ? enUS : es,
  })

  return (
    <div className={`flex gap-3 ${isClient ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
          isClient
            ? 'bg-secondary text-muted-foreground'
            : 'bg-brand text-white'
        }`}
      >
        {isAdmin ? (
          <LifeBuoy className="h-4 w-4" />
        ) : (
          message.authorName.charAt(0).toUpperCase()
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isClient ? '' : 'flex flex-col items-end'}`}>
        {showAuthor && (
          <div className={`flex items-center gap-2 mb-1 text-xs text-muted-foreground ${isClient ? '' : 'flex-row-reverse'}`}>
            <span className="font-medium text-muted-foreground">{message.authorName}</span>
            <span>{isAdmin ? t('support.bubble.staff') : t('support.bubble.client')}</span>
            <span title={dateValue.toLocaleString(locale === 'en' ? 'en-US' : 'es-ES')}>{timeAgo}</span>
          </div>
        )}

        <div
          className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 ${
            isClient
              ? 'bg-card text-foreground border border-border'
              : 'bg-brand text-white'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.body}
          </p>
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1.5 max-w-md">
            {message.attachments.map((att) => (
              <AttachmentCard key={att.id} attachment={att} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
