import { describe, expect, it } from 'vitest'
import { buildMusicVoiceFilter } from './audio-mix'

describe('music voice mix', () => {
  it('incluye sidechain, EQ, loudness y limitador', () => {
    const filter = buildMusicVoiceFilter({
      music: Buffer.from([]),
      voice: Buffer.from([]),
      duration: 10,
      voiceDelaySeconds: 0.4,
      musicVolume: 0.35,
    })

    expect(filter).toContain('sidechaincompress')
    expect(filter).toContain('highpass=f=80')
    expect(filter).toContain('equalizer=f=3200')
    expect(filter).toContain('loudnorm=I=-16')
    expect(filter).toContain('alimiter=limit=0.95')
    expect(filter).toContain('adelay=400|400')
  })

  it('permite intro musical y cama baja para cápsulas', () => {
    const filter = buildMusicVoiceFilter({
      music: Buffer.from([]),
      voice: Buffer.from([]),
      duration: 20,
      voiceDelaySeconds: 4,
      musicVolume: 0.55,
      introSeconds: 4,
      introVolume: 0.55,
      bedVolume: 0.18,
      loopMusic: true,
    })

    expect(filter).toContain('enable=\'lt(t,4)\'')
    expect(filter).toContain('volume=0.18')
    expect(filter).toContain('adelay=4000|4000')
  })
})
