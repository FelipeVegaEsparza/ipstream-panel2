import { prisma } from '@/lib/prisma'

export type TtsProvider = 'elevenlabs' | 'fish'

export async function getTtsProvider(): Promise<TtsProvider> {
  try {
    const cfg = await prisma.appConfig.findFirst({ select: { ttsProvider: true } })
    const value = (cfg?.ttsProvider || process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase()
    return value === 'fish' ? 'fish' : 'elevenlabs'
  } catch {
    return (process.env.TTS_PROVIDER || '').toLowerCase() === 'fish' ? 'fish' : 'elevenlabs'
  }
}
