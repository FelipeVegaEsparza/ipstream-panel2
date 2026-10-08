import styles from './Skeleton.module.css'

interface SkeletonProps {
  rows?: number
}

export function Skeleton({ rows = 3 }: SkeletonProps) {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className={styles.line} />
      ))}
    </div>
  )
}
