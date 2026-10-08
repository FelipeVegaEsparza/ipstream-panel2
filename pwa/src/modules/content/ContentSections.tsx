import { Fragment, type ReactNode } from 'react'
import { useTenant } from '@/core/config/TenantContext'
import { deriveServiceMode } from '@/core/service'
import { useFullClientData } from '@/core/hooks/useFullClientData'
import { ContactSection } from '@/modules/contact/ContactSection'
import { ContactSocialSection } from './ContactSocialSection'
import { WeatherForecastSection } from '@/modules/weather/WeatherForecastSection'
import { PollsSection } from '@/modules/polls/PollsSection'
import { SocialNetworksSection } from '@/modules/social/SocialNetworksSection'
import { VideosSection } from '@/modules/videos/VideosSection'
import { TvSection } from './TvSection'
import { PromotionsSection } from './PromotionsSection'
import { NewsSection } from './NewsSection'
import { ProgramsSection } from './ProgramsSection'
import { GalleriesSection } from './GalleriesSection'
import { PodcastsSection } from './PodcastsSection'
import { VideocastsSection } from './VideocastsSection'
import { EventsSection } from './EventsSection'
import { AnnouncersSection } from './AnnouncersSection'
import { SponsorsSection } from './SponsorsSection'
import {
  getSectionOrder,
  sectionAnchorId,
  type SectionId
} from './sections'
import type { SectionDataProps } from './format'
import { SectionHeadingContext } from '@/ui/SectionHeadingContext'
import { useContentSlots } from './ContentSlotsContext'

type NewsVariant = 'grid' | 'featured' | 'rows' | 'overlay'
type ProgramVariant = 'list' | 'cards' | 'tabs'

// Cada template presenta la información de forma distinta: aquí se define qué
// "forma" usa para noticias y programación (el resto hereda la paleta propia
// del template). covered y el resto no mapeados conservan sus valores actuales.
const NEWS_VARIANTS: Record<string, NewsVariant> = {
  covered: 'featured',
  blue: 'featured',
  moderno: 'overlay',
  tradicional: 'rows',
  playlist: 'rows',
  moderno2: 'featured'
}

const PROGRAM_VARIANTS: Record<string, ProgramVariant> = {
  covered: 'cards',
  blue: 'cards',
  playlist: 'cards',
  moderno2: 'tabs'
}

const ANNOUNCER_VARIANTS: Record<string, 'avatar'> = {
  covered: 'avatar'
}

// Templates que combinan Contacto + Síguenos en una sola sección, con el
// esquema de fondo en el que se renderiza (claro u oscuro).
const CONTACT_SOCIAL_SCHEMES: Record<string, 'light' | 'dark'> = {
  covered: 'light',
  blue: 'dark'
}

// Templates que muestran el clima actual dentro de la sección de pronóstico
// (no lo tienen en su header).
const CURRENT_WEATHER_TEMPLATES = new Set(['blue', 'playlist'])

function announcerVariantFor(
  template: string | null | undefined
): 'avatar' | undefined {
  return template ? ANNOUNCER_VARIANTS[template] : undefined
}

function newsVariantFor(template: string | null | undefined): NewsVariant {
  return (template && NEWS_VARIANTS[template]) || 'grid'
}

function programVariantFor(template: string | null | undefined): ProgramVariant {
  return (template && PROGRAM_VARIANTS[template]) || 'list'
}

function sectionFor(
  id: SectionId,
  { clientData, isLoading }: SectionDataProps,
  template: string | null | undefined
): ReactNode {
  const programVariant = programVariantFor(template)
  const newsVariant = newsVariantFor(template)

  switch (id) {
    case 'polls':
      return <PollsSection clientData={clientData} isLoading={isLoading} />
    case 'tv':
      return <TvSection clientData={clientData} isLoading={isLoading} />
    case 'weather':
      return (
        <WeatherForecastSection
          clientData={clientData}
          isLoading={isLoading}
          showCurrent={Boolean(template && CURRENT_WEATHER_TEMPLATES.has(template))}
        />
      )
    case 'promotions':
      return <PromotionsSection clientData={clientData} isLoading={isLoading} />
    case 'news':
      return (
        <NewsSection
          clientData={clientData}
          isLoading={isLoading}
          variant={newsVariant}
        />
      )
    case 'programs':
      return (
        <ProgramsSection
          clientData={clientData}
          isLoading={isLoading}
          variant={programVariant}
        />
      )
    case 'galleries':
      return <GalleriesSection clientData={clientData} isLoading={isLoading} />
    case 'podcasts':
      return <PodcastsSection clientData={clientData} isLoading={isLoading} />
    case 'videocasts':
      return <VideocastsSection clientData={clientData} isLoading={isLoading} />
    case 'videos':
      return <VideosSection clientData={clientData} isLoading={isLoading} />
    case 'events':
      return <EventsSection clientData={clientData} isLoading={isLoading} />
    case 'announcers':
      return (
        <AnnouncersSection
          clientData={clientData}
          isLoading={isLoading}
          variant={announcerVariantFor(template)}
        />
      )
    case 'sponsors':
      return <SponsorsSection clientData={clientData} isLoading={isLoading} />
    case 'social': {
      const scheme = template ? CONTACT_SOCIAL_SCHEMES[template] : undefined
      if (scheme) {
        return (
          <ContactSocialSection
            clientData={clientData}
            isLoading={isLoading}
            scheme={scheme}
          />
        )
      }
      return <SocialNetworksSection clientData={clientData} isLoading={isLoading} />
    }
  }
}

export function ContentSectionStack({ clientData, isLoading }: SectionDataProps) {
  const template = clientData?.selectedTemplate
  const slots = useContentSlots()
  const tvOnly = deriveServiceMode(clientData?.basicData) === 'tv'

  return (
    <SectionHeadingContext.Provider value={template === 'moderno2'}>
      {getSectionOrder(template).map((id) => {
        // En modo solo TV el video ya es el contenido principal del template.
        if (id === 'tv' && tvOnly) return null
        return (
          <Fragment key={id}>
            <div id={sectionAnchorId(id)} style={{ scrollMarginTop: 96 }}>
              {sectionFor(id, { clientData, isLoading }, template)}
            </div>
            {slots.after?.[id]}
          </Fragment>
        )
      })}
      {template !== 'minimalista' &&
        template !== 'moderno2' &&
        !(template && CONTACT_SOCIAL_SCHEMES[template]) && (
          <ContactSection
            clientData={clientData}
            withBrand={template === 'petroleo' || template === 'petroleoblue'}
          />
        )}
    </SectionHeadingContext.Provider>
  )
}

export function ContentSections() {
  const tenant = useTenant()
  const { data, isLoading } = useFullClientData(tenant.clientId ?? '')

  return <ContentSectionStack clientData={data} isLoading={isLoading} />
}
