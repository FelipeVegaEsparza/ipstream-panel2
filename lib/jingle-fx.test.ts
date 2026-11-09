import { describe, expect, it } from 'vitest'
import {
  buildJingleFilter,
  planJingleStructure,
  resolveJingleDirection,
  resolveJingleFx,
} from './jingle-fx'

describe('resolveJingleFx', () => {
  it('usa el estilo moderno por defecto y recorta la intensidad', () => {
    const fx = resolveJingleFx(undefined, 500, true)
    expect(fx.style).toBe('modern')
    expect(fx.intensity).toBe(100)
    expect(fx.riserSeconds).toBeGreaterThan(0)
    expect(fx.impactLevel).toBeGreaterThan(0)
  })

  it('resuelve los doce estilos disponibles', () => {
    const styles = [
      'classic','modern','energy','cinema','retro','pop','chill','news','sport','kids','elegant','arcade',
    ] as const
    for (const style of styles) {
      expect(resolveJingleFx(style, 65, true).style).toBe(style)
    }
  })

  it('permite elegir sonidos por momento', () => {
    const fx = resolveJingleFx('modern', 65, true, {
      introSfx: 'none',
      impactSfx: 'ding',
      transitionSfx: 'click',
      outroSfx: 'boom',
    })
    expect(fx.riserSeconds).toBe(0)
    expect(resolveJingleFx('modern', 65, true, { introSfx: 'click' }).riserSeconds).toBe(0.25)
    expect(
      resolveJingleFx('classic', 65, true, { introSfx: 'riser' }).riserSeconds
    ).toBeGreaterThan(0.8)
    expect(fx.impactLevel).toBeGreaterThan(0)
    expect(fx.impactSfx).toBe('ding')
    expect(fx.transitionSfx).toBe('click')
    expect(fx.outroSfx).toBe('boom')
    expect(resolveJingleFx('modern', 65, true, { impactSfx: 'none' }).impactLevel).toBe(0)
  })

  it('aplica carácter de voz y ajustes finos', () => {
    const phone = resolveJingleFx('modern', 65, true, { voiceCharacter: 'phone' })
    expect(phone.highPassHz).toBe(320)
    expect(phone.lowPassHz).toBe(3400)
    expect(phone.grit).toBeGreaterThan(0)

    const deep = resolveJingleFx('modern', 65, true, { voiceCharacter: 'deep', pitchSemitones: -2 })
    expect(deep.pitchFactor).toBeLessThan(0.92)

    const fast = resolveJingleFx('modern', 65, true, { speed: 1.1 })
    expect(fast.durationFactor).toBeLessThan(0.95)

    const dry = resolveJingleFx('modern', 65, true, { reverb: 0 })
    expect(dry.echo).toBeUndefined()

    const doubled = resolveJingleFx('modern', 65, true, { doubling: 0.4 })
    expect(doubled.doubling).toBe(0.4)
  })

  it('cae en moderno si el estilo no existe', () => {
    expect(resolveJingleFx('otro', 50, true).style).toBe('modern')
  })

  it('apaga los efectos de voz sin tocar la estructura', () => {
    const withFx = resolveJingleFx('modern', 65, true)
    const withoutFx = resolveJingleFx('modern', 65, false)
    expect(withoutFx.exciterAmount).toBe(0)
    expect(withoutFx.riserSeconds).toBe(withFx.riserSeconds)
    expect(withoutFx.bedLevel).toBe(withFx.bedLevel)
  })
})

describe('planJingleStructure', () => {
  it('respeta la duración pedida si la voz entra con cola', () => {
    const fx = resolveJingleFx('modern', 65, true)
    const structure = planJingleStructure({
      requestedDuration: 10,
      voiceDurationSeconds: 4,
      fx,
    })
    expect(structure.totalSeconds).toBe(10)
    expect(structure.voiceStartSeconds).toBeCloseTo(3, 3)
  })

  it('extiende el jingle antes que cortar la locución', () => {
    const fx = resolveJingleFx('cinema', 100, true)
    const structure = planJingleStructure({
      requestedDuration: 10,
      voiceDurationSeconds: 12,
      fx,
    })
    const natural = structure.voiceStartSeconds + 12 * (fx.durationFactor ?? 1) + fx.tailSeconds
    expect(structure.totalSeconds).toBeGreaterThan(12)
    expect(structure.totalSeconds).toBeGreaterThanOrEqual(natural - 0.05)
    expect(structure.totalSeconds).toBeLessThanOrEqual(natural + 0.1)
  })

  it('centra la locución sin importar la duración pedida', () => {
    const fx = resolveJingleFx('modern', 65, true)
    for (const requested of [10, 15, 30]) {
      const structure = planJingleStructure({
        requestedDuration: requested,
        voiceDurationSeconds: 4,
        fx,
      })
      expect(structure.totalSeconds).toBe(requested)
      expect(structure.voiceStartSeconds).toBeCloseTo((requested - 4) / 2, 3)
      expect(structure.totalSeconds - structure.voiceStartSeconds - 4).toBeCloseTo(
        structure.voiceStartSeconds,
        3
      )
    }
  })

  it('mantiene la estructura clásica sin riser', () => {
    const fx = resolveJingleFx('classic', 65, true)
    const structure = planJingleStructure({
      requestedDuration: 10,
      voiceDurationSeconds: 4,
      fx,
    })
    expect(structure.voiceStartSeconds).toBe(3)
  })
})

describe('buildJingleFilter', () => {
  const fx = resolveJingleFx('modern', 65, true)
  const structure = planJingleStructure({
    requestedDuration: 10,
    voiceDurationSeconds: 5,
    fx,
  })

  it('incluye riser, impacto, ducking y normalización', () => {
    const filter = buildJingleFilter(structure, fx)
    expect(filter).toContain('aevalsrc')
    expect(filter).not.toContain('sidechaincompress')
    expect(filter).toContain("volume='if(lt(t")
    expect(filter).toContain('loudnorm')
    expect(filter).toContain('alimiter')
    expect(filter).toContain('adelay=2500|2500')
    expect(filter).not.toContain('NaN')
    expect(filter).not.toContain('undefined')
  })

  it('aplica color de voz solo cuando está habilitado o se pide un carácter', () => {
    expect(buildJingleFilter(structure, fx)).not.toContain('aexciter')
    const bright = resolveJingleFx('modern', 65, true, { voiceCharacter: 'bright' })
    expect(buildJingleFilter(structure, bright)).toContain('aexciter')
    const noFx = resolveJingleFx('modern', 65, false)
    expect(buildJingleFilter(structure, noFx)).not.toContain('aexciter')
    expect(buildJingleFilter(structure, noFx)).not.toContain('aecho')
    expect(buildJingleFilter(structure, noFx)).not.toContain('deesser')
    expect(buildJingleFilter(structure, noFx)).not.toContain('equalizer=f=3200')
  })

  it('el clásico no agrega riser ni impacto', () => {
    const classic = resolveJingleFx('classic', 65, true)
    const classicStructure = planJingleStructure({
      requestedDuration: 10,
      voiceDurationSeconds: 5,
      fx: classic,
    })
    const filter = buildJingleFilter(classicStructure, classic)
    expect(filter).not.toContain('[riser]')
    expect(filter).not.toContain('[impact]')
    expect(filter).toContain('amix=inputs=2')
  })

  it('marca la diferencia de cada estilo en la voz', () => {
    const structureFor = (style: Parameters<typeof resolveJingleFx>[0]) =>
      planJingleStructure({
        requestedDuration: 10,
        voiceDurationSeconds: 5,
        fx: resolveJingleFx(style, 65, true),
      })
    const classic = buildJingleFilter(structureFor('classic'), resolveJingleFx('classic', 65, true))
    const modern = buildJingleFilter(structureFor('modern'), resolveJingleFx('modern', 65, true))
    const energy = buildJingleFilter(structureFor('energy'), resolveJingleFx('energy', 65, true))
    const cinema = buildJingleFilter(structureFor('cinema'), resolveJingleFx('cinema', 65, true))
    const retro = buildJingleFilter(structureFor('retro'), resolveJingleFx('retro', 65, true))

    expect(modern).toContain('equalizer=f=8500:t=h')
    expect(energy).toContain('equalizer=f=3400')
    expect(cinema).toContain('equalizer=f=180:t=q:w=1:g=2')
    expect(cinema).toContain('aecho=')
    expect(retro).toContain('highpass=f=250')
    expect(retro).toContain('lowpass=f=4200')
    expect(classic).not.toContain('asetrate')
    expect(classic).not.toContain('acrusher')
    expect(modern).not.toContain('atempo')
    expect(energy).not.toContain('atempo')
    expect(cinema).not.toContain('asetrate')
  })

  it('agrega el cierre cuando se elige un SFX de salida', () => {
    const withOutro = buildJingleFilter(structure, fx, { intro: '2:a', impact: '3:a', outro: '4:a' })
    expect(withOutro).toContain('[4:a]')
    expect(withOutro).toContain('[outro]')
    expect(withOutro).toContain('amix=inputs=5')
  })

  it('alinea la voz al pulso cuando se provee un inicio de música', () => {
    const beatStructure = planJingleStructure({
      requestedDuration: 10,
      voiceDurationSeconds: 5,
      fx,
      musicStartSeconds: 0.42,
    })
    expect(buildJingleFilter(beatStructure, fx)).toContain('atrim=start=0.42')
  })
})

describe('resolveJingleDirection', () => {
  it('cambia la dirección de locución por estilo', () => {
    const modern = resolveJingleDirection('modern')
    const energy = resolveJingleDirection('energy')
    const cinema = resolveJingleDirection('cinema')
    expect(new Set([modern, energy, cinema]).size).toBe(3)
    expect(resolveJingleDirection('desconocido')).toBe(resolveJingleDirection('modern'))
  })
})
