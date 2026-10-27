import { NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getAiLiveAccess } from '@/lib/ai-live'
import { getAiMusicAccess } from '@/lib/ai-music'
import { getClientVoiceSettings } from '@/lib/elevenlabs-voices'
import { getTtsProvider } from '@/lib/tts-provider'
import { getFishAudioConfig } from '@/lib/fish-audio-config'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const [music, tts, voice, client, provider] = await Promise.all([
      getAiMusicAccess(ctx.clientId),
      getAiLiveAccess(ctx.clientId),
      getClientVoiceSettings(ctx.clientId),
      prisma.client.findUnique({
        where: { id: ctx.clientId },
        select: { name: true, basicData: { select: { projectName: true } } },
      }),
      getTtsProvider(),
    ])
    const fish = provider === 'fish' ? await getFishAudioConfig() : null
    return NextResponse.json({
      musicEnabled: music.enabled,
      musicLimitSeconds: music.limitSeconds,
      musicUsedSeconds: music.usedSeconds,
      musicRemainingSeconds: music.remainingSeconds,
      ttsEnabled: tts.enabled,
      ttsRemaining: tts.remaining,
      voiceName: provider === 'fish'
        ? (fish?.referenceId ? 'Fish Audio' : 'Fish Audio (voz predeterminada)')
        : voice.name,
      voicePreset: voice.preset,
      provider,
      stationName: client?.basicData?.projectName || client?.name || 'la radio',
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[jingles/ai GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
