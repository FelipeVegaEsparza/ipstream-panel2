/**
 * Catálogo de secciones del contenido: ids, etiquetas y orden por template.
 * Se mantiene fuera de los componentes para poder compartirlo con la UI de
 * los templates (p. ej. menús de navegación por secciones).
 */

import type { FullClientData } from '@/core/types'

export type SectionId =
  | 'polls'
  | 'tv'
  | 'weather'
  | 'promotions'
  | 'news'
  | 'programs'
  | 'galleries'
  | 'podcasts'
  | 'videocasts'
  | 'videos'
  | 'events'
  | 'announcers'
  | 'sponsors'
  | 'social'

export const SECTION_LABELS: Record<SectionId, string> = {
  polls: 'Encuestas',
  tv: 'TV en vivo',
  weather: 'Clima',
  promotions: 'Promociones',
  news: 'Noticias',
  programs: 'Programación',
  galleries: 'Galerías',
  podcasts: 'Podcasts',
  videocasts: 'Videocasts',
  videos: 'Videos',
  events: 'Eventos',
  announcers: 'Locutores',
  sponsors: 'Auspiciadores',
  social: 'Síguenos'
}

export function sectionAnchorId(id: SectionId): string {
  return `seccion-${id}`
}

/** Indica si la sección tiene contenido visible para el cliente actual. */
export function sectionHasContent(
  id: SectionId,
  clientData: FullClientData | undefined,
  socialCount: number
): boolean {
  switch (id) {
    case 'news':
      return (clientData?.news?.length ?? 0) > 0
    case 'programs':
      return (clientData?.programs?.length ?? 0) > 0
    case 'podcasts':
      return (clientData?.podcasts?.length ?? 0) > 0
    case 'videocasts':
      return (clientData?.videocasts?.length ?? 0) > 0
    case 'videos':
      // VideosSection solo muestra videos con URL de reproducción.
      return (clientData?.videos?.filter((video) => Boolean(video.videoUrl))?.length ?? 0) > 0
    case 'tv':
      return Boolean(clientData?.basicData?.videoStreamingUrl)
    case 'weather': {
      const location = clientData?.basicData?.location
      const city = location?.city?.trim() ?? ''
      return (
        city.length > 0 &&
        typeof location?.latitude === 'number' &&
        typeof location?.longitude === 'number'
      )
    }
    case 'promotions':
      return (clientData?.promotions?.length ?? 0) > 0
    case 'galleries':
      return (clientData?.galleries?.length ?? 0) > 0
    case 'events':
      return (clientData?.events?.length ?? 0) > 0
    case 'announcers':
      return (clientData?.announcers?.length ?? 0) > 0
    case 'sponsors':
      return (clientData?.sponsors?.length ?? 0) > 0
    case 'polls':
      // PollsSection solo muestra encuestas activas con opciones.
      return (
        (clientData?.polls?.filter(
          (poll) => poll.active !== false && (poll.options?.length ?? 0) > 0
        )?.length ?? 0) > 0
      )
    case 'social':
      return socialCount > 0
  }
}

const EDITORIAL_ORDER: SectionId[] = [
  'news',
  'podcasts',
  'videocasts',
  'galleries',
  'events',
  'announcers'
]

export const DEFAULT_ORDER: SectionId[] = [
  'polls',
  'tv',
  'weather',
  'promotions',
  'news',
  'programs',
  'galleries',
  'podcasts',
  'videocasts',
  'videos',
  'events',
  'announcers',
  'sponsors',
  'social'
]

// Portal de radio (radiosomos.cl): lo último primero, luego programación.
const MODERNO_ORDER: SectionId[] = [
  'news',
  'programs',
  'podcasts',
  'videocasts',
  'videos',
  'promotions',
  'polls',
  'tv',
  'weather',
  'galleries',
  'events',
  'announcers',
  'sponsors',
  'social'
]

// Estilo cultural/editorial (radio13c.cl): parrilla protagonista.
// El clima y las redes sociales no se listan aquí: el template muestra el clima
// fijo bajo el hero y las redes dentro de la sección de contacto.
const PETROLEO_ORDER: SectionId[] = [
  'programs',
  'news',
  'podcasts',
  'events',
  'videos',
  'videocasts',
  'promotions',
  'polls',
  'tv',
  'galleries',
  'announcers',
  'sponsors'
]

// Lista de reproducción: noticias abren y encuestas cierran.
const PLAYLIST_ORDER: SectionId[] = [
  'news',
  'programs',
  'podcasts',
  'videocasts',
  'videos',
  'tv',
  'weather',
  'promotions',
  'galleries',
  'events',
  'announcers',
  'sponsors',
  'social',
  'polls'
]

// Azul: noticias en portada (destacada + resto) y el resto del contenido
// conserva el orden habitual.
const BLUE_ORDER: SectionId[] = [
  'news',
  'weather',
  'polls',
  'tv',
  'promotions',
  'programs',
  'galleries',
  'podcasts',
  'videocasts',
  'videos',
  'events',
  'announcers',
  'sponsors',
  'social'
]

// Portal `moderno2` (estilo radioladeliciosa): noticias y programación primero,
// luego radio, video y equipo; después el resto del contenido y auspiciadores/
// promociones. El clima multi-ciudad y el historial los compone el propio
// template. Las redes sociales no van como sección: se muestran en header y
// footer.
const MODERNO2_ORDER: SectionId[] = [
  'news',
  'programs',
  'tv',
  'videos',
  'announcers',
  'sponsors',
  'promotions',
  'podcasts',
  'videocasts',
  'galleries',
  'events',
  'polls'
]

export function getSectionOrder(template: string | null | undefined): SectionId[] {
  if (template === 'moderno2') return MODERNO2_ORDER
  if (template === 'covered') {
    // El clima abre la portada de covered, antes de las noticias. Contacto y
    // Síguenos se combinan en la sección `social` (ver ContentSections).
    const rest = DEFAULT_ORDER.filter(
      (id) => !EDITORIAL_ORDER.includes(id) && id !== 'weather'
    )
    return ['weather', ...EDITORIAL_ORDER, ...rest]
  }
  if (template === 'blue') return BLUE_ORDER
  if (template === 'moderno') return MODERNO_ORDER
  if (template === 'petroleo' || template === 'petroleoblue') return PETROLEO_ORDER
  if (template === 'playlist') return PLAYLIST_ORDER
  return DEFAULT_ORDER
}
