import { asArray } from '@/core/adapters'
import { Card, Grid, Section, SmartImage } from '@/ui'
import type { SectionDataProps } from './format'
import styles from './content.module.css'

interface AnnouncersSectionProps extends SectionDataProps {
  variant?: 'avatar'
}

export function AnnouncersSection({
  clientData,
  isLoading,
  variant
}: AnnouncersSectionProps) {
  const announcers = asArray(clientData?.announcers)
  const avatar = variant === 'avatar'

  return (
    <Section title="Locutores" visible={announcers.length > 0} loading={isLoading}>
      <Grid>
        {announcers.map((announcer) => (
          <Card key={announcer.id}>
            {avatar && announcer.imageUrl ? (
              <div className={styles.avatarWrap}>
                <SmartImage
                  className={styles.avatar}
                  src={announcer.imageUrl}
                  alt={announcer.name}
                />
              </div>
            ) : (
              <SmartImage
                className={styles.media}
                src={announcer.imageUrl}
                alt={announcer.name}
              />
            )}
            <div className={styles.body}>
              <h3 className={styles.itemTitle}>{announcer.name}</h3>
              {announcer.description && (
                <p className={styles.muted}>{announcer.description}</p>
              )}
            </div>
          </Card>
        ))}
      </Grid>
    </Section>
  )
}
