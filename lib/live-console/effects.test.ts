import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PAD_SIZE,
  createEffect,
  deleteEffect,
  loadEffects,
  loadPadSize,
  padSlots,
  saveEffect,
  savePadSize,
  type SoundEffect,
} from './effects'

function audioFile(name = 'Aplausos.wav', type = 'audio/wav'): File {
  return new File([new Uint8Array(8)], name, { type, lastModified: 1700000000000 })
}

afterEach(() => {
  window.localStorage.clear()
})

describe('sound effects', () => {
  it('crea un efecto desde un archivo de audio', () => {
    const effect = createEffect(2, audioFile())
    expect(effect.slot).toBe(2)
    expect(effect.name).toBe('Aplausos')
    expect(effect.fileName).toBe('Aplausos.wav')
    expect(effect.gainDb).toBe(0)
    expect(effect.blob).toBeInstanceOf(Blob)
    expect(effect.id).toBeTruthy()
  })

  it('rechaza archivos que no son audio', () => {
    expect(() => createEffect(0, new File(['x'], 'nota.txt', { type: 'text/plain' }))).toThrow()
  })

  it('arma los slots con null para los vacíos', () => {
    const effect = createEffect(1, audioFile())
    const slots = padSlots(new Map([[1, effect]]), 4)
    expect(slots).toHaveLength(4)
    expect(slots[0]).toBeNull()
    expect(slots[1]?.id).toBe(effect.id)
    expect(slots[3]).toBeNull()
  })

  it('persiste los efectos en IndexedDB', async () => {
    const effect = createEffect(2, audioFile('Riser.mp3', 'audio/mpeg'))
    await saveEffect(effect)
    const loaded = await loadEffects()
    expect(loaded.find((item) => item.slot === 2)?.id).toBe(effect.id)

    await deleteEffect(2)
    const afterDelete = await loadEffects()
    expect(afterDelete.find((item) => item.slot === 2)).toBeUndefined()
  })

  it('persiste el tamaño de la botonera', () => {
    expect(loadPadSize()).toBe(DEFAULT_PAD_SIZE)
    savePadSize(12)
    expect(loadPadSize()).toBe(12)
    savePadSize(99)
    expect(loadPadSize()).toBe(DEFAULT_PAD_SIZE)
  })
})
