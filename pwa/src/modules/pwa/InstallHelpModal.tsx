import { useEffect, type ReactNode } from 'react'
import { FaArrowUpFromBracket, FaEllipsisVertical, FaSquarePlus } from 'react-icons/fa6'
import { IoAddCircleOutline, IoCompassOutline } from 'react-icons/io5'
import styles from './InstallHelpModal.module.css'

export type InstallPlatform = 'apple' | 'android'

interface HelpStep {
  icon: ReactNode
  text: ReactNode
}

interface HelpContent {
  title: string
  subtitle: string
  image: string
  steps: HelpStep[]
  cta: string
}

const CONTENT: Record<InstallPlatform, HelpContent> = {
  apple: {
    title: 'Agregar a pantalla de inicio',
    subtitle: 'Sigue estos pasos desde Safari',
    image: '/app-apple.png',
    steps: [
      {
        icon: <IoCompassOutline />,
        text: (
          <>
            Abre esta web en <strong>Safari</strong>
          </>
        )
      },
      {
        icon: <FaArrowUpFromBracket />,
        text: (
          <>
            Toca el botón <strong>Compartir</strong>
          </>
        )
      },
      {
        icon: <FaSquarePlus />,
        text: (
          <>
            Elige <strong>Añadir a pantalla de inicio</strong>
          </>
        )
      },
      {
        icon: <IoAddCircleOutline />,
        text: (
          <>
            Toca <strong>Agregar</strong> para confirmar
          </>
        )
      }
    ],
    cta: 'Entendido'
  },
  android: {
    title: 'Instalar la aplicación',
    subtitle: 'Desde Chrome o tu navegador habitual',
    image: '/app-android.png',
    steps: [
      {
        icon: <FaEllipsisVertical />,
        text: (
          <>
            Abre el <strong>menú del navegador</strong> (⋮)
          </>
        )
      },
      {
        icon: <IoAddCircleOutline />,
        text: (
          <>
            Elige <strong>Instalar aplicación</strong>
          </>
        )
      },
      {
        icon: <FaSquarePlus />,
        text: (
          <>
            O <strong>Añadir a pantalla de inicio</strong> y confirma
          </>
        )
      }
    ],
    cta: 'Entendido'
  }
}

interface InstallHelpModalProps {
  platform: InstallPlatform
  onClose: () => void
}

export function InstallHelpModal({ platform, onClose }: InstallHelpModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const content = CONTENT[platform]

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
      onClick={onClose}
    >
      <div className={styles.card} onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className={styles.header}>
          <img className={styles.brandIcon} src={content.image} alt="" />
          <div className={styles.headings}>
            <h3 className={styles.title}>{content.title}</h3>
            <p className={styles.subtitle}>{content.subtitle}</p>
          </div>
        </div>

        <ol className={styles.steps}>
          {content.steps.map((step, index) => (
            <li key={index} className={styles.step}>
              <span className={styles.stepIcon} aria-hidden="true">
                {step.icon}
              </span>
              <span className={styles.stepText}>{step.text}</span>
            </li>
          ))}
        </ol>

        <button type="button" className={styles.cta} onClick={onClose}>
          {content.cta}
        </button>
      </div>
    </div>
  )
}
