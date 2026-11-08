'use client'

import { useState } from 'react'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MusicalNoteIcon,
  PlayIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { formatTime } from '@/lib/live-console/audio-math'
import type { LocalTrack } from '@/lib/live-console/types'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  queue: LocalTrack[]
  history: LocalTrack[]
  covers?: Record<string, string>
  onPlayNow: (track: LocalTrack) => Promise<void>
  onRemove: (id: string) => void
  onClear: () => void
  onMove: (id: string, direction: -1 | 1) => void
  onDropTrack?: (track: LocalTrack) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
}

const QUEUE_DRAG = 'application/x-ipstream-queue-index'

function rowTone(track: LocalTrack): string {
  if (track.kind === 'jingle') return 'playlist-row-jingle'
  if (track.kind === 'spot' || track.kind === 'announcement') return 'playlist-row-locution'
  return ''
}

function TrackBadge({ track }: { track: LocalTrack }) {
  const { t } = useDashboardI18n()
  if (track.kind === 'spot' || track.kind === 'announcement') {
    return (
      <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded-[3px] bg-[var(--locution-soft)] px-1 py-0.5 text-[8px] font-medium text-[color:var(--locution-500)]">
        <SparklesIcon className="h-2.5 w-2.5" />
        {t('live.playlist.locution')}
      </span>
    )
  }
  if (track.kind === 'jingle') {
    return (
      <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded-[3px] bg-surface-2 px-1 py-0.5 text-[8px] font-medium text-muted-foreground">
        <MusicalNoteIcon className="h-2.5 w-2.5" />
        Jingle
      </span>
    )
  }
  if (track.kind === 'capsule') {
    return (
      <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded-[3px] bg-surface-2 px-1 py-0.5 text-[8px] font-medium text-foreground">
        {t('live.playlist.capsule')}
      </span>
    )
  }
  return null
}

function TrackCover({ src, label }: { src?: string; label: string }) {
  const letter = (label || '♪').trim().charAt(0).toUpperCase() || '♪'
  return (
    <div className="h-6 w-6 overflow-hidden rounded-[3px] border border-line bg-surface-2">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-[9px] font-medium text-muted-foreground">
          {letter}
        </span>
      )}
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center px-6 text-center">
      <p className="text-[12px] font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  )
}

export function PlaylistPanel({
  queue,
  history,
  covers = {},
  onPlayNow,
  onRemove,
  onClear,
  onMove,
  onDropTrack,
  onReorder,
}: Props) {
  const { t } = useDashboardI18n()
  const recent = [...history].reverse()
  const [tab, setTab] = useState<'queue' | 'history'>('queue')
  const [dragOver, setDragOver] = useState(false)
  const [dragSource, setDragSource] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [dropAfter, setDropAfter] = useState(false)

  const resetDrag = () => {
    setDragSource(null)
    setDropIndex(null)
    setDropAfter(false)
  }

  return (
    <section
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border bg-card transition-colors ${
        dragOver ? 'border-[color:var(--signal)]' : 'border-line'
      }`}
      onDragOver={(event) => {
        if (!onDropTrack || !event.dataTransfer.types.includes('application/x-ipstream-track')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false)
      }}
      onDrop={(event) => {
        if (!onDropTrack) return
        const raw = event.dataTransfer.getData('application/x-ipstream-track')
        if (!raw) return
        event.preventDefault()
        setDragOver(false)
        try {
          const track = JSON.parse(raw) as LocalTrack
          if (track?.id && track?.title) onDropTrack(track)
        } catch {}
      }}
    >
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-2.5">
        <h2 className="text-[13px] font-medium text-foreground">{t('live.playlist.title')}</h2>
        {tab === 'queue' && queue.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[9px] text-muted-foreground transition-colors hover:text-danger"
            title={t('live.playlist.clearTitle')}
          >
            {t('live.playlist.clear')}
          </button>
        )}
      </div>

      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setTab('queue')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b px-3 py-2 text-[10px] font-medium transition-colors ${
            tab === 'queue'
              ? 'border-[color:var(--signal)] bg-surface-2 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('live.playlist.nextSection')}
          <span className="rounded-[3px] bg-surface-3 px-1 text-[8px] text-muted-foreground">{queue.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b px-3 py-2 text-[10px] font-medium transition-colors ${
            tab === 'history'
              ? 'border-[color:var(--signal)] bg-surface-2 text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('live.playlist.playedSection')}
          <span className="rounded-[3px] bg-surface-3 px-1 text-[8px] text-muted-foreground">{history.length}</span>
        </button>
      </div>

      <div className="grid grid-cols-[18px_26px_minmax(0,1fr)_48px_auto] items-center gap-1 border-b border-line bg-surface-2 px-2 py-1 text-[9px] font-medium text-muted-foreground">
        <span />
        <span />
        <span>{t('live.playlist.trackArtist')}</span>
        <span className="text-right">{t('live.playlist.durationShort')}</span>
        <span className="text-right">{t('live.playlist.actions')}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'queue' ? (
          queue.length === 0 ? (
            <EmptyState title={t('live.playlist.emptyQueue')} hint={t('live.playlist.emptyQueueHint')} />
          ) : (
            <ul className="divide-y divide-line/60">
              {queue.map((track, index) => (
                <li
                  key={track.id}
                  draggable={Boolean(onReorder)}
                  onDragStart={(event) => {
                    if (!onReorder) return
                    event.dataTransfer.setData(QUEUE_DRAG, String(index))
                    event.dataTransfer.effectAllowed = 'move'
                    setDragSource(index)
                  }}
                  onDragEnd={resetDrag}
                  onDragOver={(event) => {
                    if (!onReorder || !event.dataTransfer.types.includes(QUEUE_DRAG)) return
                    event.preventDefault()
                    event.stopPropagation()
                    event.dataTransfer.dropEffect = 'move'
                    const rect = event.currentTarget.getBoundingClientRect()
                    setDropIndex(index)
                    setDropAfter(event.clientY > rect.top + rect.height / 2)
                  }}
                  onDrop={(event) => {
                    if (!onReorder) return
                    const raw = event.dataTransfer.getData(QUEUE_DRAG)
                    if (!raw) return
                    event.preventDefault()
                    event.stopPropagation()
                    const from = Number(raw)
                    if (!Number.isInteger(from)) {
                      resetDrag()
                      return
                    }
                    const rect = event.currentTarget.getBoundingClientRect()
                    const after = event.clientY > rect.top + rect.height / 2
                    let to = index + (after ? 1 : 0)
                    if (from < to) to -= 1
                    onReorder(from, to)
                    resetDrag()
                  }}
                  className={`group grid grid-cols-[18px_26px_minmax(0,1fr)_48px_auto] items-center gap-1 px-2 py-1.5 transition-colors ${
                    onReorder ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${
                    dropIndex === index
                      ? dropAfter
                        ? 'border-b border-[color:var(--signal)]'
                        : 'border-t border-[color:var(--signal)]'
                      : ''
                  } ${dragSource === index ? 'opacity-40' : ''} ${rowTone(track) || 'hover:bg-surface-2'}`}
                >
                  <span className="text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <TrackCover src={covers[track.id]} label={track.title} />
                  <div className="min-w-0">
                    <p className="flex items-center truncate text-[11px] font-medium text-foreground">
                      <span className="truncate">{track.title}</span>
                      <TrackBadge track={track} />
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">{track.artist || '—'}</p>
                  </div>
                  <span className="text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                    {formatTime(track.duration)}
                  </span>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => void onPlayNow(track)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
                      title={t('live.playlist.play')}
                      aria-label={t('live.playlist.playLabel', { name: track.title })}
                    >
                      <PlayIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(track.id, -1)}
                      disabled={index === 0}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                      title={t('live.playlist.moveUp')}
                      aria-label={`${t('live.playlist.moveUp')} ${track.title}`}
                    >
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(track.id, 1)}
                      disabled={index === queue.length - 1}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20"
                      title={t('live.playlist.moveDown')}
                      aria-label={`${t('live.playlist.moveDown')} ${track.title}`}
                    >
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(track.id)}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      title={t('live.playlist.remove')}
                      aria-label={`${t('live.playlist.removeLabel', { name: track.title })}`}
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : recent.length === 0 ? (
          <EmptyState title={t('live.playlist.emptyHistory')} hint={t('live.playlist.emptyHistoryHint')} />
        ) : (
          <ul className="divide-y divide-line/60">
            {recent.map((track) => (
              <li
                key={`history-${track.id}`}
                className={`group grid grid-cols-[18px_26px_minmax(0,1fr)_48px_auto] items-center gap-1 px-2 py-1.5 opacity-70 ${rowTone(track)}`}
              >
                <CheckCircleIcon className="h-3 w-3 text-muted-foreground" />
                <TrackCover src={covers[track.id]} label={track.title} />
                <div className="min-w-0">
                  <p className="flex items-center truncate text-[10px] font-medium text-muted-foreground">
                    <span className="truncate">{track.title}</span>
                    <TrackBadge track={track} />
                  </p>
                  <p className="truncate text-[9px] text-muted-foreground/70">{track.artist || '—'}</p>
                </div>
                <span className="text-right font-mono text-[9px] tabular-nums text-muted-foreground">
                  {formatTime(track.duration)}
                </span>
                <button
                  type="button"
                  onClick={() => void onPlayNow(track)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  title={t('live.playlist.replay')}
                  aria-label={`${t('live.playlist.replay')} ${track.title}`}
                >
                  <PlayIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
