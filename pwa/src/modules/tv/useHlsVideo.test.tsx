import { act, render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHlsVideo } from './useHlsVideo'

type Handler = (...args: unknown[]) => void
interface MockInstance {
  handlers: Record<string, Handler>
  config: Record<string, unknown>
  startLoad: ReturnType<typeof vi.fn>
  recoverMediaError: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

const hlsMock = vi.hoisted(() => {
  const instances: MockInstance[] = []
  const state = { supported: true }
  class MockHls {
    static isSupported() {
      return state.supported
    }
    static Events = { MANIFEST_PARSED: 'manifestParsed', ERROR: 'error' }
    static ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
      OTHER_ERROR: 'otherError'
    }
    handlers: Record<string, Handler> = {}
    config: Record<string, unknown> = {}
    startLoad = vi.fn()
    recoverMediaError = vi.fn()
    destroy = vi.fn()
    loadSource = vi.fn()
    attachMedia = vi.fn()
    constructor(config: Record<string, unknown> = {}) {
      this.config = config
      instances.push(this as unknown as MockInstance)
    }
    on(event: string, cb: Handler) {
      this.handlers[event] = cb
    }
  }
  return { MockHls, instances, state }
})

vi.mock('hls.js', () => ({ default: hlsMock.MockHls }))

function Harness({ src }: { src: string | null }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { status, muted, needsInteraction } = useHlsVideo(ref, src)
  return (
    <>
      <video ref={ref} data-testid="video" />
      <span>{status}</span>
      <span>{muted ? 'muted' : 'unmuted'}</span>
      <span>{needsInteraction ? 'needs-interaction' : 'no-interaction'}</span>
    </>
  )
}

async function renderHls() {
  render(<Harness src="https://x/stream.m3u8" />)
  await waitFor(() => expect(hlsMock.instances.length).toBe(1))
  return hlsMock.instances[0]!
}

beforeEach(() => {
  hlsMock.instances.length = 0
  hlsMock.state.supported = true
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useHlsVideo', () => {
  it('configura hls.js para mantenerse cerca del borde en vivo', async () => {
    const instance = await renderHls()

    expect(instance.config).toMatchObject({
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 6,
      maxLiveSyncPlaybackRate: 1.5
    })
  })

  it('ignora los errores no fatales (no consume reintentos ni marca error)', async () => {
    const instance = await renderHls()

    act(() => {
      instance.handlers.error?.('error', { fatal: false, type: 'networkError' })
    })

    expect(instance.startLoad).not.toHaveBeenCalled()
    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('reintenta errores fatales de red y luego marca error', async () => {
    const instance = await renderHls()

    for (let i = 0; i < 3; i += 1) {
      act(() => {
        instance.handlers.error?.('error', { fatal: true, type: 'networkError' })
      })
    }
    expect(instance.startLoad).toHaveBeenCalledTimes(3)
    expect(screen.getByText('loading')).toBeInTheDocument()

    act(() => {
      instance.handlers.error?.('error', { fatal: true, type: 'networkError' })
    })
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('marca error cuando HLS no está soportado', async () => {
    hlsMock.state.supported = false
    render(<Harness src="https://x/stream.m3u8" />)

    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument())
  })

  it('usa HLS nativo cuando el navegador lo declara', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe')
    render(<Harness src="https://x/stream.m3u8" />)

    const video = await screen.findByTestId('video')
    await waitFor(() => expect(video.getAttribute('src')).toBe('https://x/stream.m3u8'))
    expect(hlsMock.instances.length).toBe(0)
  })

  it('no marca error en HLS nativo ante un evento "stalled" aislado', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe')
    render(<Harness src="https://x/stream.m3u8" />)

    const video = await screen.findByTestId('video')
    act(() => {
      video.dispatchEvent(new Event('stalled'))
    })

    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('reintenta el HLS nativo ante un error aislado antes de marcarlo', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe')
    render(<Harness src="https://x/stream.m3u8" />)

    const video = await screen.findByTestId('video')
    await waitFor(() => expect(video.getAttribute('src')).toBe('https://x/stream.m3u8'))

    act(() => {
      video.dispatchEvent(new Event('error'))
    })

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(screen.queryByText('error')).toBeNull()
  })

  it('cae a hls.js cuando el HLS nativo agota sus reintentos', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('maybe')
    render(<Harness src="https://x/stream.m3u8" />)

    const video = await screen.findByTestId('video')
    await waitFor(() => expect(video.getAttribute('src')).toBe('https://x/stream.m3u8'))

    for (let i = 0; i < 4; i += 1) {
      act(() => {
        video.dispatchEvent(new Event('error'))
      })
    }

    await waitFor(() => expect(hlsMock.instances.length).toBe(1))
  })

  it('reproduce automáticamente y marca "playing" con el evento playing', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const instance = await renderHls()

    act(() => {
      instance.handlers.manifestParsed?.('manifestParsed')
    })

    const video = screen.getByTestId('video')
    act(() => {
      video.dispatchEvent(new Event('playing'))
    })

    expect(screen.getByText('playing')).toBeInTheDocument()
    expect(screen.getByText('unmuted')).toBeInTheDocument()
  })

  it('cae a reproducción silenciada si el autoplay con sonido es rechazado', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
      .mockResolvedValue(undefined)
    const instance = await renderHls()

    await act(async () => {
      instance.handlers.manifestParsed?.('manifestParsed')
    })

    await waitFor(() => expect(screen.getByText('muted')).toBeInTheDocument())
    expect(play).toHaveBeenCalledTimes(2)
  })
})
