import { createContext, useContext, type ReactNode } from 'react'
import type { SectionId } from './sections'

/**
 * Permite a un template inyectar contenido propio dentro del stack de
 * secciones (que es data-driven y se renderiza vía `<Outlet>`), p. ej. el
 * historial de canciones después de la sección de noticias.
 */
export interface ContentSlots {
  /** Nodo que se renderiza justo después de la sección indicada. */
  after?: Partial<Record<SectionId, ReactNode>>
}

export const ContentSlotsContext = createContext<ContentSlots>({})

export function useContentSlots(): ContentSlots {
  return useContext(ContentSlotsContext)
}
