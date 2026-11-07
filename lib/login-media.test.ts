import { describe, expect, it } from 'vitest'
import { getLoginMediaKind, isVideoLoginMedia } from './login-media'

describe('login media', () => {
  it('detecta videos por extensión', () => {
    expect(getLoginMediaKind('/api/uploads/login/login_123.mp4')).toBe('video')
    expect(getLoginMediaKind('/api/uploads/login/login_123.webm')).toBe('video')
    expect(getLoginMediaKind('https://cdn.example.com/fondo.MP4?token=abc')).toBe('video')
    expect(isVideoLoginMedia('https://cdn.example.com/fondo.mov')).toBe(true)
  })

  it('trata imágenes y valores vacíos como imagen', () => {
    expect(getLoginMediaKind('/api/uploads/login/login_123.webp')).toBe('image')
    expect(getLoginMediaKind('https://example.com/fondo.jpg')).toBe('image')
    expect(getLoginMediaKind(null)).toBe('image')
    expect(getLoginMediaKind('')).toBe('image')
    expect(isVideoLoginMedia(undefined)).toBe(false)
  })
})
