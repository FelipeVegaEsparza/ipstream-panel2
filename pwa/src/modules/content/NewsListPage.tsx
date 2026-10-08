import { useNavigate } from 'react-router-dom'
import { usePageParam } from '@/core/hooks/usePageParam'
import { NewsList } from './NewsList'
import styles from './content.module.css'

export function NewsListPage() {
  const navigate = useNavigate()
  const [page, setPage] = usePageParam()

  return (
    <div>
      <h1 className={styles.sectionTitle}>Noticias</h1>
      <NewsList
        page={page}
        onPageChange={setPage}
        onSelect={(item) => navigate(`/noticias/${item.slug}`)}
      />
    </div>
  )
}
