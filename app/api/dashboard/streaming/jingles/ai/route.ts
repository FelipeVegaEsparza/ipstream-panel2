import { NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getAiLiveAccess } from '@/lib/ai-live'
import { getClientVoiceSettings } from '@/lib/elevenlabs-voices'
import { getTtsProvider } from '@/lib/tts-provider'
import { getClientFishVoice, getFishAudioConfig } from '@/lib/fish-audio-config'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const [tts, voice, client, provider, stream] = await Promise.all([
      getAiLiveAccess(ctx.clientId),
      getClientVoiceSettings(ctx.clientId),
      prisma.client.findUnique({
        where: { id: ctx.clientId },
        select: { name: true, basicData: { select: { projectName: true } } },
      }),
      getTtsProvider(),
      prisma.radioStream.findUnique({
        where: { clientId: ctx.clientId },
        select: {
          jingleMusicTrack: {
            select: { id: true, name: true, artist: true, url: true, active: true },
          },
        },
      }),
    ])
    const [fish, fishVoice] = provider === 'fish'
      ? await Promise.all([getFishAudioConfig(), getClientFishVoice(ctx.clientId)])
      : [null, null]
    const musicTrack = stream?.jingleMusicTrack?.active ? stream.jingleMusicTrack : null
    return NextResponse.json({
      ttsEnabled: tts.enabled,
      ttsRemaining: tts.remaining,
      voiceName: provider === 'fish'
        ? (fishVoice?.name || (fish?.referenceId ? 'Fish Audio' : 'Fish Audio (voz predeterminada)'))
        : voice.name,
      voicePreset: voice.preset,
      provider,
      stationName: client?.basicData?.projectName || client?.name || 'la radio',
      musicTrackId: musicTrack?.id || null,
      musicTrackName: musicTrack?.name || null,
      musicTrackArtist: musicTrack?.artist || null,
      musicTrackUrl: musicTrack?.url || null,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[jingles/ai GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
