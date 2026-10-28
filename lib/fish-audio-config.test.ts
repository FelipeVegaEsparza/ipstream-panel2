import { describe, expect, it } from 'vitest'
import { parseFishVoiceCatalog } from './fish-audio-config'

describe('parseFishVoiceCatalog', () => {
  it('acepta 3 masculinas y 3 femeninas y descarta la cuarta de cada género', () => {
    const raw = JSON.stringify([
      { id: 'm1', name: 'M1', gender: 'male', referenceId: 'ref-m1' },
      { id: 'm2', name: 'M2', gender: 'male', referenceId: 'ref-m2' },
      { id: 'm3', name: 'M3', gender: 'male', referenceId: 'ref-m3' },
      { id: 'm4', name: 'M4', gender: 'male', referenceId: 'ref-m4' },
      { id: 'f1', name: 'F1', gender: 'female', referenceId: 'ref-f1' },
      { id: 'f2', name: 'F2', gender: 'female', referenceId: 'ref-f2' },
      { id: 'f3', name: 'F3', gender: 'female', referenceId: 'ref-f3' },
      { id: 'f4', name: 'F4', gender: 'female', referenceId: 'ref-f4' },
    ])
    const voices = parseFishVoiceCatalog(raw)
    expect(voices).toHaveLength(6)
    expect(voices.filter((voice) => voice.gender === 'male')).toHaveLength(3)
    expect(voices.filter((voice) => voice.gender === 'female')).toHaveLength(3)
    expect(voices.some((voice) => voice.id === 'm4')).toBe(false)
  })

  it('ignora voces incompletas y géneros inválidos', () => {
    const raw = JSON.stringify([
      { id: 'ok', name: 'Válida', gender: 'female', referenceId: 'ref-ok' },
      { id: 'no-name', name: '', gender: 'male', referenceId: 'ref-x' },
      { id: 'no-ref', name: 'Sin ref', gender: 'male', referenceId: '' },
      { id: 'bad-gender', name: 'Otro', gender: 'other', referenceId: 'ref-y' },
    ])
    expect(parseFishVoiceCatalog(raw)).toEqual([
      { id: 'ok', name: 'Válida', gender: 'female', referenceId: 'ref-ok' },
    ])
  })

  it('genera IDs únicos cuando vienen vacíos o repetidos', () => {
    const raw = JSON.stringify([
      { name: 'M1', gender: 'male', referenceId: 'ref-m1' },
      { id: 'm1', name: 'M2', gender: 'male', referenceId: 'ref-m2' },
    ])
    const voices = parseFishVoiceCatalog(raw)
    expect(voices).toHaveLength(2)
    expect(new Set(voices.map((voice) => voice.id)).size).toBe(2)
  })
})
