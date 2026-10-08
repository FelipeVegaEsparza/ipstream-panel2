import { describe, expect, it } from 'vitest'
import { getTemplate } from './index'
import { MinimalistaTemplate } from './minimalista/MinimalistaTemplate'
import { ModernaTemplate } from './moderna/ModernaTemplate'
import { BlueTemplate } from './blue/BlueTemplate'
import { ModernoTemplate } from './moderno/ModernoTemplate'
import { TradicionalTemplate } from './tradicional/TradicionalTemplate'
import { AppTemplate } from './app/AppTemplate'
import { PetroleoTemplate } from './petroleo/PetroleoTemplate'
import { PetroleoBlueTemplate } from './petroleoblue/PetroleoBlueTemplate'
import { PlaylistTemplate } from './playlist/PlaylistTemplate'
import { CoveredTemplate } from './covered/CoveredTemplate'
import { Moderno2Template } from './moderno2/Moderno2Template'

describe('getTemplate', () => {
  it('devuelve el template registrado para cada id', () => {
    expect(getTemplate('minimalista')).toBe(MinimalistaTemplate)
    expect(getTemplate('moderna')).toBe(ModernaTemplate)
    expect(getTemplate('blue')).toBe(BlueTemplate)
    expect(getTemplate('moderno')).toBe(ModernoTemplate)
    expect(getTemplate('tradicional')).toBe(TradicionalTemplate)
    expect(getTemplate('app')).toBe(AppTemplate)
    expect(getTemplate('petroleo')).toBe(PetroleoTemplate)
    expect(getTemplate('petroleoblue')).toBe(PetroleoBlueTemplate)
    expect(getTemplate('playlist')).toBe(PlaylistTemplate)
    expect(getTemplate('covered')).toBe(CoveredTemplate)
    expect(getTemplate('moderno2')).toBe(Moderno2Template)
  })

  it('devuelve el template por defecto ante id desconocido o nulo', () => {
    expect(getTemplate('no-existe')).toBe(MinimalistaTemplate)
    expect(getTemplate(null)).toBe(MinimalistaTemplate)
    expect(getTemplate(undefined)).toBe(MinimalistaTemplate)
  })
})
