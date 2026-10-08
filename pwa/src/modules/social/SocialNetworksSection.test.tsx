import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FullClientData, SocialNetworks } from '@/core/types'
import { SocialLinks, SocialNetworksSection } from './SocialNetworksSection'

function clientDataWith(socialNetworks: SocialNetworks | null): FullClientData {
  return { socialNetworks } as unknown as FullClientData
}

describe('SocialNetworksSection', () => {
  it('no se renderiza sin redes configuradas', () => {
    render(
      <SocialNetworksSection
        clientData={clientDataWith(null)}
        isLoading={false}
      />
    )
    expect(screen.queryByText('Síguenos')).toBeNull()
  })

  it('muestra solo las redes con URL como íconos', () => {
    render(
      <SocialNetworksSection
        clientData={clientDataWith({
          facebook: 'https://facebook.com/radio',
          youtube: null,
          instagram: 'https://instagram.com/radio',
          tiktok: null,
          whatsapp: null,
          x: null,
          createdAt: '',
          updatedAt: ''
        })}
        isLoading={false}
      />
    )
    expect(screen.getByText('Síguenos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://facebook.com/radio'
    )
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'YouTube' })).toBeNull()
  })

  it('usa el color de marca cuando brand está activo', () => {
    render(
      <SocialLinks
        brand
        links={[{ key: 'facebook', label: 'Facebook', url: 'https://facebook.com/radio' }]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Facebook' }).getAttribute('style')
    ).toContain('background')
  })
})
