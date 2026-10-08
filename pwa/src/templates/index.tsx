import {
  Component,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode
} from 'react'
import type { FullClientData } from '@/core/types'
import { useAccentTheme } from '@/modules/theme/useAccentTheme'

export const DEFAULT_TEMPLATE_ID = 'minimalista'

export interface TemplateProps {
  clientData: FullClientData | undefined
  isLoading: boolean
}

type TemplateComponent = LazyExoticComponent<ComponentType<TemplateProps>>

// Registro de templates cargados de forma diferida: cada cliente baja solo el
// que usa, y el registro puede crecer sin inflar el bundle inicial de todos.
const templates: Record<string, TemplateComponent> = {
  minimalista: lazy(() =>
    import('./minimalista/MinimalistaTemplate').then((m) => ({ default: m.MinimalistaTemplate }))
  ),
  moderna: lazy(() =>
    import('./moderna/ModernaTemplate').then((m) => ({ default: m.ModernaTemplate }))
  ),
  blue: lazy(() =>
    import('./blue/BlueTemplate').then((m) => ({ default: m.BlueTemplate }))
  ),
  moderno: lazy(() =>
    import('./moderno/ModernoTemplate').then((m) => ({ default: m.ModernoTemplate }))
  ),
  tradicional: lazy(() =>
    import('./tradicional/TradicionalTemplate').then((m) => ({ default: m.TradicionalTemplate }))
  ),
  app: lazy(() =>
    import('./app/AppTemplate').then((m) => ({ default: m.AppTemplate }))
  ),
  petroleo: lazy(() =>
    import('./petroleo/PetroleoTemplate').then((m) => ({ default: m.PetroleoTemplate }))
  ),
  petroleoblue: lazy(() =>
    import('./petroleoblue/PetroleoBlueTemplate').then((m) => ({ default: m.PetroleoBlueTemplate }))
  ),
  playlist: lazy(() =>
    import('./playlist/PlaylistTemplate').then((m) => ({ default: m.PlaylistTemplate }))
  ),
  covered: lazy(() =>
    import('./covered/CoveredTemplate').then((m) => ({ default: m.CoveredTemplate }))
  ),
  moderno2: lazy(() =>
    import('./moderno2/Moderno2Template').then((m) => ({ default: m.Moderno2Template }))
  )
}

export const TEMPLATE_IDS = Object.keys(templates)

export function getTemplate(templateId?: string | null): TemplateComponent {
  return (templateId && templates[templateId]) || templates[DEFAULT_TEMPLATE_ID]
}

interface BoundaryProps {
  clientData: FullClientData | undefined
  isLoading: boolean
  children: ReactNode
}

interface BoundaryState {
  failed: boolean
}

/**
 * Si un template no existe o falla al cargar, cae al template por defecto en
 * vez de romper toda la app.
 */
class TemplateErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Template failed to load/render; usando el template por defecto:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const Fallback = templates[DEFAULT_TEMPLATE_ID]
    return <Fallback clientData={this.props.clientData} isLoading={this.props.isLoading} />
  }
}

export function TemplateSlot({
  templateId,
  clientData,
  isLoading
}: TemplateProps & { templateId?: string | null }) {
  useAccentTheme(clientData?.accentColor)
  const Template = getTemplate(templateId)
  return (
    <TemplateErrorBoundary clientData={clientData} isLoading={isLoading}>
      <Template clientData={clientData} isLoading={isLoading} />
    </TemplateErrorBoundary>
  )
}
