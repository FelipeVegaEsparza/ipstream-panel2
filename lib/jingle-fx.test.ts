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
    expect(structure.voiceStartSeconds).toBeCloseTo(fx.riserSeconds + fx.voiceLeadSeconds, 3)
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

  it('mantiene la estructura clásica sin riser', () => {
    const fx = resolveJingleFx('classic', 65, true)
    const structure = planJingleStructure({
      requestedDuration: 10,
      voiceDurationSeconds: 4,
      fx,
    })
    expect(structure.voiceStartSeconds).toBe(0.4)
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
    expect(filter).toContain('sidechaincompress')
    expect(filter).toContain('loudnorm')
    expect(filter).toContain('alimiter')
    expect(filter).toContain('adelay=1000|1000')
    expect(filter).not.toContain('NaN')
    expect(filter).not.toContain('undefined')
  })

  it('aplica color de voz solo cuando está habilitado', () => {
    expect(buildJingleFilter(structure, fx)).toContain('aexciter')
    const noFx = resolveJingleFx('modern', 65, false)
    expect(buildJingleFilter(structure, noFx)).not.toContain('aexciter')
    expect(buildJingleFilter(structure, noFx)).not.toContain('aecho')
    expect(buildJingleFilter(structure, noFx)).not.toContain('deesser')
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
    expect(energy).toContain('atempo=1.053')
    expect(cinema).toContain('asetrate=41454')
    expect(cinema).toContain('atempo=1.033')
    expect(retro).toContain('highpass=f=300')
    expect(retro).toContain('lowpass=f=3400')
    expect(retro).toContain('acrusher')
    expect(classic).not.toContain('asetrate')
    expect(classic).not.toContain('acrusher')
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
