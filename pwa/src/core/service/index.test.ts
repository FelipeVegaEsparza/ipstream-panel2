import { describe, expect, it } from 'vitest'
import type { BasicData } from '@/core/types'
import { deriveServiceMode, getTvStreamUrl } from './index'

function basic(overrides: Partial<BasicData> = {}): BasicData {
  return {
    projectName: 'Radio Test',
    projectDescription: '',
    logoUrl: null,
    coverUrl: null,
    websiteUrl: null,
    radioStreamingUrl: null,
    videoStreamingUrl: null,
    createdAt: '',
    updatedAt: '',
    ...overrides
  }
}

describe('deriveServiceMode', () => {
  it('radio cuando solo hay radioStreamingUrl', () => {
    expect(deriveServiceMode(basic({ radioStreamingUrl: 'https://r' }))).toBe('radio')
  })

  it('tv cuando solo hay videoStreamingUrl', () => {
    expect(deriveServiceMode(basic({ videoStreamingUrl: 'https://v' }))).toBe('tv')
  })

  it('both cuando hay las dos', () => {
    expect(
      deriveServiceMode(
        basic({ radioStreamingUrl: 'https://r', videoStreamingUrl: 'https://v' })
      )
    ).toBe('both')
  })

  it('radio cuando no hay URLs', () => {
    expect(deriveServiceMode(basic())).toBe('radio')
  })

  it('radio cuando no hay datos', () => {
    expect(deriveServiceMode(null)).toBe('radio')
    expect(deriveServiceMode(undefined)).toBe('radio')
  })

  it('ignora URLs vacías o con espacios', () => {
    expect(
      deriveServiceMode(
        basic({ radioStreamingUrl: '   ', videoStreamingUrl: 'https://v' })
      )
    ).toBe('tv')
  })
})

describe('getTvStreamUrl', () => {
  it('devuelve la URL cuando existe', () => {
    expect(
      getTvStreamUrl(basic({ videoStreamingUrl: 'https://panelipstream.cl/tv/tv_1.m3u8' }))
    ).toBe('https://panelipstream.cl/tv/tv_1.m3u8')
  })

  it('recorta los espacios de la URL', () => {
    expect(
      getTvStreamUrl(basic({ videoStreamingUrl: '  https://v/x.m3u8  ' }))
    ).toBe('https://v/x.m3u8')
  })

  it('devuelve null cuando es null', () => {
    expect(getTvStreamUrl(basic({ videoStreamingUrl: null }))).toBeNull()
  })

  it('devuelve null con cadena vacía o solo espacios', () => {
    expect(getTvStreamUrl(basic({ videoStreamingUrl: '' }))).toBeNull()
    expect(getTvStreamUrl(basic({ videoStreamingUrl: '   ' }))).toBeNull()
  })

  it('devuelve null sin datos', () => {
    expect(getTvStreamUrl(null)).toBeNull()
    expect(getTvStreamUrl(undefined)).toBeNull()
  })
})
