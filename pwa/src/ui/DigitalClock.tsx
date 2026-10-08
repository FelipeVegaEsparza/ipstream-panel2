import { useEffect, useState } from 'react'
import styles from './DigitalClock.module.css'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  })
}

export function DigitalClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={styles.clock}>
      <span className={styles.time}>{formatTime(now)}</span>
      <span className={styles.date}>{formatDate(now)}</span>
    </div>
  )
}
