import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAccentTheme } from './useAccentTheme'

const TOKENS = [
  '--brand-accent',
  '--brand-accent-hover',
  '--brand-accent-rgb',
  '--brand-accent-soft',
  '--brand-accent-contrast',
  '--brand-accent-on'
]

afterEach(() => {
  for (const token of TOKENS) {
    document.documentElement.style.removeProperty(token)
  }
})

describe('useAccentTheme', () => {
  it('aplica los tokens derivados cuando hay color', () => {
    renderHook(() => useAccentTheme('#ff6b00'))

    const style = document.documentElement.style
    expect(style.getPropertyValue('--brand-accent')).toBe('#ff6b00')
    expect(style.getPropertyValue('--brand-accent-rgb')).toBe('255, 107, 0')
    expect(style.getPropertyValue('--brand-accent-soft')).toBe(
      'rgba(255, 107, 0, 0.15)'
    )
    expect(style.getPropertyValue('--brand-accent-contrast')).toMatch(
      /^#(ffffff|000000)$/
    )
    expect(style.getPropertyValue('--brand-accent-on')).toBe('1')
  })

  it('no aplica tokens cuando es null', () => {
    renderHook(() => useAccentTheme(null))
    expect(
      document.documentElement.style.getPropertyValue('--brand-accent')
    ).toBe('')
    expect(
      document.documentElement.style.getPropertyValue('--brand-accent-on')
    ).toBe('')
  })

  it('ignora un valor inválido', () => {
    renderHook(() => useAccentTheme('no-es-un-color'))
    expect(
      document.documentElement.style.getPropertyValue('--brand-accent')
    ).toBe('')
  })
})
