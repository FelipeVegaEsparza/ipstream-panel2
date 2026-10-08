import { useEffect } from 'react'
import { getBakedClientName } from '@/core/config/tenant'

export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    // `projectName` manda; si viene vacío se usa el nombre configurado en el
    // build del cliente para no dejar el título genérico por defecto.
    const name = title?.trim() || getBakedClientName()
    if (name) {
      document.title = name
    }
  }, [title])
}
