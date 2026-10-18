'use client'

import { useMemo } from 'react'
import { FileBrowser } from './FileBrowser'
import { PlayerBar } from './PlayerBar'
import { PlaylistPanel } from './PlaylistPanel'
import { SessionPanel } from './SessionPanel'
import { SoundEffectsPad } from './SoundEffectsPad'
import { useLiveConsole } from '@/lib/live-console/use-live-console'

export function LiveConsole() {
  const live = useLiveConsole()
  const playlistIds = useMemo(
    () => new Set(live.library.queue.map((track) => track.id)),
    [live.library.queue]
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reproductor en vivo</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Elegí música de tu equipo, armá la lista y salí al aire. Si la fuente queda en silencio,
            el AutoDJ retoma el control automáticamente.
          </p>
        </div>
        <div className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
          Calidad objetivo: <span className="font-mono text-foreground">192 kbps</span>
        </div>
      </div>

      <SessionPanel
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[520px] lg:h-[560px]">
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

        <div className="h-[520px] lg:h-[560px]">
          <PlaylistPanel
            queue={live.library.queue}
            current={live.player.current}
            nextTrack={live.player.nextTrack}
            playing={live.player.playing}
            onPlayNow={live.player.playNow}
            onRemove={live.player.removeFromPlaylist}
            onClear={live.player.clearPlaylist}
            onMove={live.player.moveInPlaylist}
          />
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

      <SoundEffectsPad
        padSize={live.effects.padSize}
        slots={live.effects.slots}
        loading={live.effects.loading}
        error={live.effects.error}
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
