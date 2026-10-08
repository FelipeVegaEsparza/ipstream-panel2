import { Section } from '@/ui'
import { InstallPrompt } from '@/modules/pwa/InstallPrompt'
import { ShareButton } from '@/modules/share/ShareButton'
import { ContactForm } from '@/modules/contact/ContactSection'
import { SocialLinks } from '@/modules/social/SocialNetworksSection'
import { BrandIcon, getSocialLinks } from '@/modules/social/brand'
import type { SectionDataProps } from './format'
import styles from './ContactSocialSection.module.css'

interface ContactSocialSectionProps extends SectionDataProps {
  /** Esquema del fondo donde se renderiza: claro u oscuro. */
  scheme?: 'light' | 'dark'
}

export function ContactSocialSection({
  clientData,
  scheme = 'light'
}: ContactSocialSectionProps) {
  const links = getSocialLinks(clientData?.socialNetworks)
  const whatsapp = clientData?.socialNetworks?.whatsapp ?? null
  const website = clientData?.basicData?.websiteUrl ?? null
  const name = clientData?.basicData?.projectName
  const onLight = scheme === 'light'

  return (
    <div className={styles.grid}>
      <Section title="Contáctanos" visible flush>
        <ContactForm />
      </Section>
      <Section title="Síguenos" visible flush>
        <div className={styles.aside}>
          <p className={styles.copy}>Síguenos y llévate la radio contigo.</p>

          <SocialLinks links={links} brand />

          {whatsapp && (
            <a
              className={styles.whatsapp}
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <BrandIcon name="whatsapp" size={18} />
              Escríbenos por WhatsApp
            </a>
          )}

          <div className={styles.apps}>
            <span className={styles.appsLabel}>Instala la app</span>
            <InstallPrompt variant={onLight ? 'dark' : 'default'} />
          </div>

          {website && (
            <a
              className={styles.website}
              href={website}
              target="_blank"
              rel="noreferrer"
            >
              Visita nuestro sitio →
            </a>
          )}

          <ShareButton
            title={name}
            className={onLight ? styles.shareLink : undefined}
          />
        </div>
      </Section>
    </div>
  )
}
