import { asArray } from '@/core/adapters'
import { Card, Grid, Section, SmartImage } from '@/ui'
import type { SectionDataProps } from './format'
import styles from './content.module.css'

export function PromotionsSection({ clientData, isLoading }: SectionDataProps) {
  const promotions = asArray(clientData?.promotions)

  return (
    <Section title="Promociones" visible={promotions.length > 0} loading={isLoading}>
      <Grid>
        {promotions.map((promotion) => (
          <Card key={promotion.id}>
            <SmartImage className={styles.media} src={promotion.imageUrl} alt={promotion.title} />
            <div className={styles.body}>
              <h3 className={styles.itemTitle}>{promotion.title}</h3>
              {promotion.description && (
                <p className={styles.muted}>{promotion.description}</p>
              )}
              {promotion.link && (
                <a
                  className={styles.muted}
                  href={promotion.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver promoción
                </a>
              )}
            </div>
          </Card>
        ))}
      </Grid>
    </Section>
  )
}
