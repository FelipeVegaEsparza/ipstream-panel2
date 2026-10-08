import { asArray } from '@/core/adapters'
import { Card, Grid, Section, SmartImage } from '@/ui'
import type { SectionDataProps } from './format'
import { formatDate } from './format'
import styles from './content.module.css'

function scheduleText(date: string | undefined, time: string | undefined): string {
  const parts: string[] = []
  if (date) {
    const iso = date.includes('T') ? date : `${date}T${time ?? '00:00'}`
    const formatted = formatDate(iso)
    parts.push(formatted || date)
  }
  if (time) parts.push(time)
  return parts.join(' · ')
}

export function EventsSection({ clientData, isLoading }: SectionDataProps) {
  const events = asArray(clientData?.events)

  return (
    <Section title="Eventos" visible={events.length > 0} loading={isLoading}>
      <Grid>
        {events.map((event) => (
          <Card key={event.id}>
            <SmartImage className={styles.media} src={event.imageUrl} alt={event.title} />
            <div className={styles.body}>
              <h3 className={styles.itemTitle}>{event.title}</h3>
              <p className={styles.muted}>
                {scheduleText(event.date, event.time)}
                {event.location ? ` · ${event.location}` : ''}
              </p>
              {event.eventUrl && (
                <a
                  className={styles.muted}
                  href={event.eventUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Más información
                </a>
              )}
            </div>
          </Card>
        ))}
      </Grid>
    </Section>
  )
}
