import { createContext, useContext } from 'react'

/**
 * Activa los encabezados de sección "display": palabra gigante de fondo
 * (`data-bg-text`) y última palabra resaltada. Lo activa el stack de contenido
 * cuando el template seleccionado lo pide (p. ej. `moderno2`).
 */
export const SectionHeadingContext = createContext(false)

export function useDisplaySectionHeadings(): boolean {
  return useContext(SectionHeadingContext)
}
