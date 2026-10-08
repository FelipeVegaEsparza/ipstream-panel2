import type { ReactNode } from 'react'
import { Skeleton } from './Skeleton'
import { useDisplaySectionHeadings } from './SectionHeadingContext'
import styles from './Section.module.css'

interface SectionProps {
  title?: string
  /**
   * Palabra gigante de fondo (`data-bg-text`). Si se omite y el modo display
   * está activo, se usa el propio título.
   */
  bgText?: string
  visible: boolean
  loading?: boolean
  /** Quita el margen vertical de la sección (para composición dentro de grids). */
  flush?: boolean
  children: ReactNode
}

/** Resalta la última palabra del título. */
function withHighlight(title: string): ReactNode {
  const trimmed = title.trim()
  const match = trimmed.match(/\s+(\S+)$/)

  if (!match) {
    return <span className={styles.highlight}>{trimmed}</span>
  }

  const head = trimmed.slice(0, trimmed.length - match[0].length)
  return (
    <>
      {head} <span className={styles.highlight}>{match[1]}</span>
    </>
  )
}

export function Section({
  title,
  bgText,
  visible,
  loading,
  flush = false,
  children
}: SectionProps) {
  const displayHeadings = useDisplaySectionHeadings()
  const sectionClass = flush ? `${styles.section} ${styles.sectionFlush}` : styles.section
  const headingBg = title ? (bgText ?? (displayHeadings ? title : undefined)) : undefined

  const heading = title ? (
    <h2 className={styles.title} data-bg-text={headingBg}>
      {displayHeadings ? withHighlight(title) : title}
    </h2>
  ) : null

  if (loading) {
    return (
      <section className={sectionClass}>
        {heading}
        <Skeleton />
      </section>
    )
  }

  if (!visible) return null

  return (
    <section className={sectionClass}>
      {heading}
      {children}
    </section>
  )
}
