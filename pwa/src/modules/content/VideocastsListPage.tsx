import { useNavigate } from 'react-router-dom'
import { usePageParam } from '@/core/hooks/usePageParam'
import { VideocastsList } from './VideocastsList'
import styles from './content.module.css'

export function VideocastsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = usePageParam()

  return (
    <div>
      <h1 className={styles.sectionTitle}>Videocasts</h1>
      <VideocastsList
        page={page}
        onPageChange={setPage}
        onSelect={(item) => navigate(`/videocasts/${item.id}`)}
      />
    </div>
  )
}
