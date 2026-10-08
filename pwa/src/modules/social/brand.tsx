import type { SocialNetworks } from '@/core/types'
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube
} from 'react-icons/fa6'

export type SocialKey = Exclude<keyof SocialNetworks, 'createdAt' | 'updatedAt'>

export const SOCIAL_DEFS: Array<{ key: SocialKey; label: string }> = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'x', label: 'X' }
]

/** Color de marca de cada red, para mostrarla sobre fondos claros. */
export const SOCIAL_COLORS: Record<SocialKey, string> = {
  facebook: '#1877f2',
  youtube: '#ff0000',
  instagram: '#e1306c',
  tiktok: '#010101',
  whatsapp: '#25d366',
  x: '#000000'
}

const ICONS: Record<SocialKey, React.ComponentType<{ size?: number }>> = {
  facebook: FaFacebookF,
  youtube: FaYoutube,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  whatsapp: FaWhatsapp,
  x: FaXTwitter
}

interface BrandIconProps {
  name: SocialKey
  size?: number
}

export function BrandIcon({ name, size = 18 }: BrandIconProps) {
  const Icon = ICONS[name]
  return <Icon size={size} aria-hidden="true" />
}

export function getSocialLinks(
  social: SocialNetworks | null | undefined
): Array<{ key: SocialKey; label: string; url: string }> {
  return SOCIAL_DEFS.flatMap(({ key, label }) => {
    const url = social?.[key]
    return url ? [{ key, label, url }] : []
  })
}
