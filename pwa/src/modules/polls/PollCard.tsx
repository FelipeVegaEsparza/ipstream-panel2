import { useEffect, useRef, useState } from 'react'
import type { Poll } from '@/core/types'
import { votePoll } from '@/core/api'
import { useTenant } from '@/core/config/TenantContext'
import { readString, writeString } from '@/core/storage/safeStorage'
import { Card } from '@/ui'
import styles from './PollCard.module.css'

function pollKey(pollId: string): string {
  return `poll_${pollId}`
}

function totalVotes(poll: Poll): number {
  return (poll.options ?? []).reduce((sum, option) => sum + option.votes, 0)
}

interface PollCardProps {
  poll: Poll
}

export function PollCard({ poll }: PollCardProps) {
  const tenant = useTenant()
  const clientId = tenant.status === 'ready' ? tenant.clientId : null
  const [voted, setVoted] = useState(() => readString(pollKey(poll.id)) === 'true')
  const [updated, setUpdated] = useState<Poll | null>(null)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const votingRef = useRef(false)

  // El snapshot local del voto no debe congelar los resultados: cuando llegan
  // datos más frescos del servidor (mismo o mayor total de votos), se descarta.
  useEffect(() => {
    if (!updated) return
    if (poll.id === updated.id && totalVotes(poll) >= totalVotes(updated)) {
      setUpdated(null)
    }
  }, [poll, updated])

  const data = updated ?? poll
  const total = totalVotes(data)

  async function handleVote(optionId: string) {
    if (!clientId || votingRef.current) return
    votingRef.current = true
    setVoting(true)
    setError(null)
    try {
      const updatedPoll = await votePoll(clientId, poll.id, optionId)
      setUpdated(updatedPoll)
      setVoted(true)
      // La persistencia es solo una ayuda local: writeString nunca lanza, así
      // que un fallo de storage no se presenta como error de voto.
      writeString(pollKey(poll.id), 'true')
    } catch {
      setError('No se pudo enviar tu voto. Intenta de nuevo.')
    } finally {
      votingRef.current = false
      setVoting(false)
    }
  }

  return (
    <Card>
      <div className={styles.body}>
        <h3 className={styles.title}>{data.title}</h3>

        {voted ? (
          <ul className={styles.results}>
            {(data.options ?? []).map((option) => {
              const pct = total > 0 ? Math.round((option.votes / total) * 100) : 0
              return (
                <li key={option.id} className={styles.resultRow}>
                  <div className={styles.resultMeta}>
                    <span>{option.text}</span>
                    <span className={styles.resultCount}>
                      {option.votes} · {pct}%
                    </span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <ul className={styles.options}>
            {(data.options ?? []).map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={styles.optionBtn}
                  disabled={voting}
                  onClick={() => handleVote(option.id)}
                >
                  {option.text}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </Card>
  )
}
