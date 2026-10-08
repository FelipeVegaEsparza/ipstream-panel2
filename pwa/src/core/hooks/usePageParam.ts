import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

function parsePage(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback
}

/**
 * Página actual sincronizada con el query string (?page=N). Al cambiar de
 * página se actualiza la URL (con replace) para que "atrás"/"adelante" del
 * navegador y compartir enlaces conserven la página.
 */
export function usePageParam(fallback = 1): [number, (page: number) => void] {
  const [params, setParams] = useSearchParams()
  const page = parsePage(params.get('page'), fallback)

  const setPage = useCallback(
    (next: number) => {
      const safe = Math.max(1, Math.floor(next))
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          if (safe <= 1) {
            updated.delete('page')
          } else {
            updated.set('page', String(safe))
          }
          return updated
        },
        { replace: true }
      )
    },
    [setParams]
  )

  return [page, setPage]
}
