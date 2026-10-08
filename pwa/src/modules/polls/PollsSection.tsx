import { asArray } from '@/core/adapters'
import { Section } from '@/ui'
import type { SectionDataProps } from '@/modules/content/format'
import { PollCard } from './PollCard'
import styles from './PollsSection.module.css'

export function PollsSection({ clientData, isLoading }: SectionDataProps) {
  const polls = asArray(clientData?.polls).filter(
    (poll) => poll.active !== false && (poll.options?.length ?? 0) > 0
  )

  return (
    <Section title="Encuestas" visible={polls.length > 0} loading={isLoading}>
      <div className={styles.grid}>
        {polls.map((poll) => (
          <PollCard key={poll.id} poll={poll} />
        ))}
      </div>
    </Section>
  )
}
