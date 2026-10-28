import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  mix: vi.fn(),
  probe: vi.fn(),
  radioFind: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { radioStream: { findUnique: mocks.radioFind } },
}))
vi.mock('@/lib/audio-mix', () => ({
  mixMusicAndVoice: mocks.mix,
  probeAudioBufferDuration: mocks.probe,
}))

const { addCapsuleIntro } = await import('./capsule-ai-audio')

describe('addCapsuleIntro', () => {
  it('mezcla la voz con una cama musical y hace una sola mezcla', async () => {
    mocks.radioFind.mockResolvedValue({
      jingleMusicTrack: { url: '/api/uploads/music/test.mp3', active: true },
    })
    mocks.probe.mockResolvedValue(8)
    mocks.mix.mockResolvedValue(Buffer.from([7]))

    const result = await addCapsuleIntro('client-1', Buffer.from([9]))

    expect(mocks.mix).toHaveBeenCalledTimes(1)
    expect(mocks.mix.mock.calls[0][0]).toMatchObject({
      duration: 13.2,
      loopMusic: true,
      introSeconds: 4,
    })
    expect(result).toEqual(Buffer.from([7]))
  })
})
