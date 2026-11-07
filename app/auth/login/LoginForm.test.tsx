import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import LoginForm from './LoginForm'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/ui/PanelLogo', () => ({
  PanelLogo: () => <div data-testid="logo" />,
}))

describe('LoginForm background', () => {
  it('renderiza un video cuando el fondo es video', () => {
    const { container } = render(
      <LoginForm
        backgroundMedia="/api/uploads/login/login_123.mp4"
        backgroundIsVideo
        callbackUrl={null}
      />
    )

    const video = container.querySelector('video') as HTMLVideoElement | null
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toBe('/api/uploads/login/login_123.mp4')
    expect(video?.autoplay).toBe(true)
    expect(video?.loop).toBe(true)
    expect(video?.muted).toBe(true)
    expect(video?.playsInline).toBe(true)
  })

  it('renderiza una imagen cuando el fondo no es video', () => {
    const { container } = render(
      <LoginForm
        backgroundMedia="/api/uploads/login/login_123.webp"
        backgroundIsVideo={false}
        callbackUrl={null}
      />
    )

    expect(container.querySelector('video')).toBeNull()
    expect(
      container.querySelector('img[src="/api/uploads/login/login_123.webp"]')
    ).not.toBeNull()
  })
})
