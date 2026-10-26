import { describe, expect, it } from 'vitest'
import { shouldShowFloatingChat } from './visibility'

describe('shouldShowFloatingChat', () => {
  it('no muestra el widget si el chat está deshabilitado', () => {
    expect(
      shouldShowFloatingChat({
        chatEnabled: false,
        pathname: '/noticias',
        selectedTemplate: 'moderno',
      })
    ).toBe(false)
  })

  it('muestra el widget en páginas internas', () => {
    expect(
      shouldShowFloatingChat({
        chatEnabled: true,
        pathname: '/noticias',
        selectedTemplate: 'moderno',
      })
    ).toBe(true)
  })

  it('no duplica el widget en el home que ya tiene sección', () => {
    expect(
      shouldShowFloatingChat({
        chatEnabled: true,
        pathname: '/',
        selectedTemplate: 'moderno',
      })
    ).toBe(false)
  })

  it('usa el widget en el home de minimalista o sin template definido', () => {
    expect(
      shouldShowFloatingChat({
        chatEnabled: true,
        pathname: '/',
        selectedTemplate: 'minimalista',
      })
    ).toBe(true)
    expect(
      shouldShowFloatingChat({
        chatEnabled: true,
        pathname: '/',
        selectedTemplate: null,
      })
    ).toBe(true)
  })
})
