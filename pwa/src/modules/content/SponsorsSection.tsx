import { asArray } from '@/core/adapters'
import { Card, Grid, Section, SmartImage } from '@/ui'
import type { SectionDataProps } from './format'
import styles from './content.module.css'

export function SponsorsSection({ clientData, isLoading }: SectionDataProps) {
  const sponsors = asArray(clientData?.sponsors)

  return (
    <Section title="Auspiciadores" visible={sponsors.length > 0} loading={isLoading}>
      <Grid>
        {sponsors.map((sponsor) => (
          <Card key={sponsor.id}>
            <div className={styles.body}>
              <SmartImage
                className={styles.media}
                src={sponsor.logoUrl}
                alt={sponsor.name}
              />
              <h3 className={styles.itemTitle}>{sponsor.name}</h3>
              {sponsor.description && (
                <p className={styles.muted}>{sponsor.description}</p>
              )}
              {sponsor.website && (
                <a
                  className={styles.muted}
                  href={sponsor.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Sitio web
                </a>
              )}
            </div>
          </Card>
        ))}
      </Grid>
    </Section>
  )
}
