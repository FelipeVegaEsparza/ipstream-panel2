import { useState } from 'react'
import { sendContactMessage, type ContactSubmitResult } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { SocialLinks } from '@/modules/social/SocialNetworksSection'
import { getSocialLinks } from '@/modules/social/brand'
import { Section, SmartImage } from '@/ui'
import type { SectionDataProps } from '@/modules/content/format'
import styles from './ContactSection.module.css'

const SUCCESS_TEXT = '¡Gracias! Tu mensaje fue enviado.'
const RATE_LIMITED_TEXT = 'Demasiados intentos. Intenta de nuevo en unos minutos.'
const GENERIC_ERROR_TEXT = 'Error al enviar. Intenta de nuevo.'
const NETWORK_ERROR_TEXT = 'Error de conexión. Intenta de nuevo.'

type Status = { kind: 'ok' | 'error'; text: string } | null

function errorTextFor(result: ContactSubmitResult): string {
  switch (result.status) {
    case 'sent':
      return SUCCESS_TEXT
    case 'rate-limited':
      return RATE_LIMITED_TEXT
    case 'validation-error':
      return result.error
    case 'network-error':
      return NETWORK_ERROR_TEXT
    default:
      return GENERIC_ERROR_TEXT
  }
}

export function ContactForm() {
  const tenant = useTenant()
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const clientId = tenant.status === 'ready' ? tenant.clientId : null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sending || !clientId) return

    const form = event.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    setSending(true)
    setStatus(null)

    const data = new FormData(form)
    const result = await sendContactMessage(clientId, {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      message: String(data.get('message') ?? '').trim()
    })

    if (result.status === 'sent') {
      form.reset()
      setStatus({ kind: 'ok', text: SUCCESS_TEXT })
    } else {
      setStatus({ kind: 'error', text: errorTextFor(result) })
    }
    setSending(false)
  }

  return (
    <>
      <p className={styles.intro}>
        Envíanos tu mensaje y te responderemos a la brevedad.
      </p>
      <form className={styles.form} onSubmit={handleSubmit} aria-label="Formulario de contacto">
        <label className={styles.field} htmlFor="contact-name">
          <span className={styles.label}>Nombre</span>
          <input
            id="contact-name"
            className={styles.input}
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="Tu nombre"
          />
        </label>

        <label className={styles.field} htmlFor="contact-email">
          <span className={styles.label}>Email</span>
          <input
            id="contact-email"
            className={styles.input}
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="Tu email"
          />
        </label>

        <label className={styles.field} htmlFor="contact-phone">
          <span className={styles.label}>Teléfono</span>
          <input
            id="contact-phone"
            className={styles.input}
            name="phone"
            type="tel"
            required
            maxLength={40}
            placeholder="Tu teléfono"
          />
        </label>

        <label className={styles.field} htmlFor="contact-message">
          <span className={styles.label}>Mensaje</span>
          <textarea
            id="contact-message"
            className={styles.textarea}
            name="message"
            required
            maxLength={2000}
            rows={5}
            placeholder="Tu mensaje"
          />
        </label>

        <button type="submit" className={styles.submit} disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar'}
        </button>

        {status && (
          <p
            className={
              status.kind === 'ok' ? styles.statusOk : styles.statusError
            }
            role="status"
            aria-live="polite"
          >
            {status.text}
          </p>
        )}
      </form>
    </>
  )
}

interface ContactSectionProps extends Partial<SectionDataProps> {
  /** Muestra una columna con logo, descripción y redes sociales de la radio. */
  withBrand?: boolean
}

export function ContactSection({ clientData, withBrand = false }: ContactSectionProps) {
  if (!withBrand) {
    return (
      <Section title="Contáctanos" visible>
        <ContactForm />
      </Section>
    )
  }

  const links = getSocialLinks(clientData?.socialNetworks)
  const logo = clientData?.basicData?.logoUrl
  const name = clientData?.basicData?.projectName
  const description = clientData?.basicData?.projectDescription

  return (
    <Section title="Contáctanos" visible>
      <div className={styles.layout}>
        <aside className={styles.brandCol}>
          <SmartImage className={styles.brandLogo} src={logo} alt={name ?? ''} />
          {description && <p className={styles.brandDesc}>{description}</p>}
          {links.length > 0 && <SocialLinks links={links} />}
        </aside>
        <div className={styles.formCol}>
          <ContactForm />
        </div>
      </div>
    </Section>
  )
}
