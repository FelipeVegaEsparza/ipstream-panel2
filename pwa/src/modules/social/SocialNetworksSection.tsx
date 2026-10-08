import { Section } from '@/ui'
import type { SectionDataProps } from '@/modules/content/format'
import { BrandIcon, getSocialLinks, SOCIAL_COLORS } from './brand'
import styles from './SocialNetworksSection.module.css'

interface SocialLinksProps {
  links: ReturnType<typeof getSocialLinks>
  /** Usa el color de marca de cada red (para fondos claros). */
  brand?: boolean
}

export function SocialLinks({ links, brand = false }: SocialLinksProps) {
  return (
    <div className={styles.links}>
      {links.map((link) => (
        <a
          key={link.key}
          className={styles.link}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          title={link.label}
          style={
            brand
              ? {
                  background: SOCIAL_COLORS[link.key],
                  borderColor: SOCIAL_COLORS[link.key],
                  color: '#ffffff'
                }
              : undefined
          }
        >
          <BrandIcon name={link.key} size={20} />
        </a>
      ))}
    </div>
  )
}

export function SocialNetworksSection({ clientData, isLoading }: SectionDataProps) {
  const links = getSocialLinks(clientData?.socialNetworks)

  return (
    <Section title="Síguenos" visible={links.length > 0} loading={isLoading}>
      <SocialLinks links={links} />
    </Section>
  )
}
