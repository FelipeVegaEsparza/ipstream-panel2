import { useNavigate } from 'react-router-dom'
import { usePageParam } from '@/core/hooks/usePageParam'
import { PodcastsList } from './PodcastsList'
import styles from './content.module.css'

export function PodcastsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = usePageParam()

  return (
    <div>
      <h1 className={styles.sectionTitle}>Podcasts</h1>
      <PodcastsList
        page={page}
        onPageChange={setPage}
        onSelect={(item) => navigate(`/podcasts/${item.id}`)}
      />
    </div>
  )
}
