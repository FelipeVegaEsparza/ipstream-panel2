import type { FullClientData } from '@/core/types'
import { ContactForm } from '@/modules/contact/ContactSection'
import { InstallPrompt } from '@/modules/pwa/InstallPrompt'
import { SocialLinks } from '@/modules/social/SocialNetworksSection'
import { getSocialLinks } from '@/modules/social/brand'
import { Section, SmartImage } from '@/ui'
import styles from './Moderno2Contact.module.css'

interface Moderno2ContactProps {
  clientData: FullClientData | undefined
}

/**
 * Bloque de cierre de `moderno2`: formulario de contacto (llega al dashboard) a
 * la izquierda; a la derecha el cover de la radio, las redes y la instalación
 * de la PWA.
 */
export function Moderno2Contact({ clientData }: Moderno2ContactProps) {
  const links = getSocialLinks(clientData?.socialNetworks)
  const cover = clientData?.basicData?.coverUrl
  const logo = clientData?.basicData?.logoUrl
  const name = clientData?.basicData?.projectName ?? ''

  return (
    <Section title="Contáctanos" bgText="CONTACTO" visible>
      <div className={styles.grid}>
        <div className={styles.formCol}>
          <ContactForm />
        </div>

        <div className={styles.aside}>
          <SmartImage
            className={styles.cover}
            src={cover}
            fallbacks={[logo]}
            alt={name}
          />

          {links.length > 0 && (
            <div className={styles.group}>
              <span className={styles.groupLabel}>Síguenos</span>
              <SocialLinks links={links} brand />
            </div>
          )}

          <div className={styles.group}>
            <span className={styles.groupLabel}>Instala la app</span>
            <InstallPrompt />
          </div>
        </div>
      </div>
    </Section>
  )
}
