import {
  createContext,
  use,
  useEffect,
  useState,
  type ReactNode
} from 'react'
import {
  getBakedClientId,
  getBakedClientName,
  getPublicApiBase,
  resolveTenantByHost
} from './tenant'

export type TenantStatus = 'resolving' | 'ready' | 'notFound'

export type TenantState =
  | { status: 'resolving'; clientId: null; name: null; baseUrl: null }
  | { status: 'ready'; clientId: string; name: string | null; baseUrl: string }
  | { status: 'notFound'; clientId: null; name: null; baseUrl: null }

const RESOLVING: TenantState = { status: 'resolving', clientId: null, name: null, baseUrl: null }
const NOT_FOUND: TenantState = { status: 'notFound', clientId: null, name: null, baseUrl: null }

function readyState(clientId: string, name: string | null): TenantState {
  return { status: 'ready', clientId, name, baseUrl: getPublicApiBase(clientId) }
}

/**
 * Estado inicial del tenant. Si el build trae un `clientId` horneado (dev o
 * build por cliente), se usa de inmediato; si no (bundle único de cliente), se
 * resuelve por host de forma asíncrona en el efecto.
 */
function initialTenantState(): TenantState {
  const baked = getBakedClientId()
  return baked ? readyState(baked, getBakedClientName()) : RESOLVING
}

interface TenantContextValue {
  tenant: TenantState
}

const TenantContext = createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantState>(initialTenantState)

  useEffect(() => {
    if (getBakedClientId()) return // ya resuelto por build
    let active = true
    void resolveTenantByHost(window.location.hostname).then((resolved) => {
      if (!active) return
      setTenant(resolved ? readyState(resolved.clientId, resolved.name) : NOT_FOUND)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <TenantContext value={{ tenant }}>{children}</TenantContext>
  )
}

export function useTenant(): TenantState {
  const ctx = use(TenantContext)
  if (!ctx) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return ctx.tenant
}
