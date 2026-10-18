'use client'

import { DeckCard } from './DeckCard'
import { LibraryPanel } from './LibraryPanel'
import { MixerBar } from './MixerBar'
import { SessionPanel } from './SessionPanel'
import { useLiveConsole } from '@/lib/live-console/use-live-console'

export function LiveConsole() {
  const live = useLiveConsole()
  const { A, B } = live.decks

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transmitir en vivo</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tu consola en el navegador: música local, micrófono, EQ y loops. Los archivos no se suben
            al servidor; solo sale la mezcla hacia tu radio.
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
        current={live.current}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <DeckCard
              deck={A}
              cue={live.cue.A}
              onPlay={() => void live.playDeck('A')}
              onPause={() => live.pauseDeck('A')}
              onSeek={(seconds) => live.seekDeck('A', seconds)}
              onGain={(db) => live.setDeckGain('A', db)}
              onEq={(band, db) => live.setDeckEq('A', band, db)}
              onLoop={(loop) => live.setDeckLoop('A', loop)}
              onClearLoop={() => live.clearDeckLoop('A')}
              onToggleCue={() => live.toggleCue('A')}
            />
            <DeckCard
              deck={B}
              cue={live.cue.B}
              onPlay={() => void live.playDeck('B')}
              onPause={() => live.pauseDeck('B')}
              onSeek={(seconds) => live.seekDeck('B', seconds)}
              onGain={(db) => live.setDeckGain('B', db)}
              onEq={(band, db) => live.setDeckEq('B', band, db)}
              onLoop={(loop) => live.setDeckLoop('B', loop)}
              onClearLoop={() => live.clearDeckLoop('B')}
              onToggleCue={() => live.toggleCue('B')}
            />
          </div>

          <MixerBar
            crossfader={live.crossfader}
            onCrossfader={live.setCrossfader}
            masterDb={live.masterDb}
            onMasterDb={live.setMasterDb}
            masterLevelDb={live.masterLevelDb}
            mic={live.mic}
            onEnableMic={live.enableMic}
            onDisableMic={live.disableMic}
            onMicGain={live.setMicGain}
            onTalkover={live.setTalkover}
            onMicCue={live.setMicCue}
          />

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            El programa se envía al stream y el cue se reproduce solo en tu salida local. Para
            transmitir música con la mejor calidad posible, usá archivos locales sin DRM y
            auriculares con cable.
          </p>
        </div>

        <LibraryPanel
          tracks={live.library.tracks}
          queue={live.library.queue}
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
          onEnqueue={live.library.enqueue}
          onDequeue={live.library.dequeue}
          onClearQueue={live.library.clearQueue}
          onLoadToDeck={live.loadToDeck}
        />
      </div>
    </div>
  )
}
