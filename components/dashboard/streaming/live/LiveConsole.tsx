'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { FileBrowser } from './FileBrowser'
import { AnnouncementsBar } from './AnnouncementsBar'
import { JinglesPanel } from './JinglesPanel'
import { AiLocutionModal } from './AiLocutionModal'
import { BroadcastBar } from './BroadcastBar'
import { PlayerBar } from './PlayerBar'
import { PlaylistPanel } from './PlaylistPanel'
import { SoundEffectsPad } from './SoundEffectsPad'
import { StereoVuMeter } from './StereoVuMeter'
import { useLiveConsole } from '@/lib/live-console/use-live-console'

export function LiveConsole({
  premiumVoiceAvailable = false,
  aiEnabled = false,
  stationName = 'la radio',
  aiRemaining = 0,
  aiLimit = 0,
  aiPresenterEnabled = false,
  aiPresenterEvery = 3,
  aiIntroPhrases = [],
}: {
  premiumVoiceAvailable?: boolean
  aiEnabled?: boolean
  stationName?: string
  aiRemaining?: number
  aiLimit?: number
  aiPresenterEnabled?: boolean
  aiPresenterEvery?: number
  aiIntroPhrases?: string[]
}) {
  const live = useLiveConsole({
    premiumVoiceAvailable,
    aiEnabled,
    stationName,
    aiRemaining,
    aiLimit,
    aiPresenterEnabled,
    aiPresenterEvery,
    aiIntroPhrases,
  })
  const [composerOpen, setComposerOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = async () => {
    const root = rootRef.current
    if (!root) return
    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen()
      } else {
        await root.requestFullscreen()
      }
    } catch {
      // Algunos navegadores no permiten fullscreen en este contexto.
    }
  }

  const panelHeight = isFullscreen
    ? 'h-[calc(100vh-480px)] min-h-[260px]'
    : 'h-[520px] lg:h-[560px]'

  const playlistIds = useMemo(
    () => new Set(live.library.queue.map((track) => track.id)),
    [live.library.queue]
  )

  return (
    <div
      ref={rootRef}
      className={isFullscreen ? 'flex min-h-screen flex-col gap-4 overflow-y-auto bg-background p-4' : 'space-y-5'}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reproductor en vivo</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Elegí música de tu equipo, armá la lista y salí al aire. Si la fuente queda en silencio,
            el AutoDJ retoma el control automáticamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
            Calidad objetivo: <span className="font-mono text-foreground">192 kbps</span>
          </div>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="h-3.5 w-3.5" />
            ) : (
              <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla completa'}</span>
          </button>
        </div>
      </div>

      <BroadcastBar
        engineReady={live.engineReady}
        state={live.session.state}
        transport={live.session.transport}
        stats={live.session.stats}
        error={live.session.error}
        slots={live.session.slots}
        maxDjs={live.session.maxDjs}
        slotId={live.session.slotId}
        onSlotId={live.setSlotId}
        mount={live.session.mount}
        bitrate={live.session.bitrate}
        streamBitrate={live.session.streamBitrate}
        headphonesConfirmed={live.headphonesConfirmed}
        onHeadphonesConfirmed={live.setHeadphonesConfirmed}
        onGoLive={live.goLive}
        onStopLive={live.stopLive}
        onReconnect={live.reconnect}
        onRefreshSlots={live.refreshSlots}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_108px_minmax(0,1fr)_168px]">
        <div className={panelHeight}>
          <FileBrowser
            tracks={live.library.tracks}
            playlistIds={playlistIds}
            scanning={live.library.scanning}
            restoring={live.library.restoring}
            progress={live.library.progress}
            persisted={live.library.persisted}
            supportsPersistence={live.library.supportsPersistence}
            error={live.library.error}
            onAddFiles={live.library.addFiles}
            onAddDirectory={live.library.addDirectory}
            onRestoreDirectory={live.library.restoreDirectory}
            onRemoveTrack={live.library.removeTrack}
            onAddToPlaylist={live.player.addToPlaylist}
            onPlayNow={live.player.playNow}
          />
        </div>

        <div className="h-40 lg:h-auto">
          <StereoVuMeter
            leftDb={live.masterLevels.left}
            rightDb={live.masterLevels.right}
          />
        </div>

        <div className={panelHeight}>
          <PlaylistPanel
            queue={live.library.queue}
            history={live.library.history}
            onPlayNow={live.player.playNow}
            onRemove={live.player.removeFromPlaylist}
            onClear={live.player.clearPlaylist}
            onMove={live.player.moveInPlaylist}
            onDropTrack={live.player.addToPlaylist}
          />
        </div>

        <div className="flex flex-col gap-3">
          <AnnouncementsBar
            loading={live.announcements.loading}
            error={live.announcements.error}
            voice={live.announcements.voice}
            premiumAvailable={premiumVoiceAvailable}
            freeFormAvailable={aiEnabled}
            onVoice={live.announcements.setVoice}
            onAnnounce={live.announcements.announce}
            onOpenComposer={() => setComposerOpen(true)}
          />
          <JinglesPanel onAdd={live.player.addToPlaylist} />
        </div>
      </div>

      <PlayerBar
        current={live.player.current}
        nextTrack={live.player.nextTrack}
        playing={live.player.playing}
        position={live.player.position}
        duration={live.player.duration}
        onPlay={live.player.play}
        onPause={live.player.pause}
        onPrevious={live.player.previous}
        onNext={live.player.next}
        onSeek={live.player.seek}
        mic={live.mic}
        onEnableMic={live.enableMic}
        onDisableMic={live.disableMic}
        onMicGain={live.setMicGain}
        monitorEnabled={live.monitorEnabled}
        onMonitor={live.setMonitor}
      />

      {aiEnabled && (
        <AiLocutionModal
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          generate={live.ai.generateSpeech}
          onAdd={live.ai.addSpot}
        />
      )}

      <SoundEffectsPad
        padSize={live.effects.padSize}
        slots={live.effects.slots}
        loading={live.effects.loading}
        error={live.effects.error}
        libraryMode={live.effects.libraryMode}
        manageHref="/dashboard/sound-effects"
        onPadSize={live.effects.setPadSize}
        onAdd={live.effects.addEffect}
        onRemove={live.effects.removeEffect}
        onGain={live.effects.setGain}
        onPlay={live.effects.play}
        onStopAll={live.effects.stopAll}
      />
    </div>
  )
}
