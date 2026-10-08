import {
  createContext,
  use,
  useState,
  type ReactNode
} from 'react'
import {
  getBakedClientId,
  getBakedClientName,
  getPublicApiBase
} from './tenant'

export type TenantStatus = 'resolving' | 'ready' | 'notFound'

export type TenantState =
  | { status: 'resolving'; clientId: null; name: null; baseUrl: null }
  | { status: 'ready'; clientId: string; name: string | null; baseUrl: string }
  | { status: 'notFound'; clientId: null; name: null; baseUrl: null }

function resolveTenant(): TenantState {
  const clientId = getBakedClientId()
  if (!clientId) {
    return { status: 'notFound', clientId: null, name: null, baseUrl: null }
  }
  return {
    status: 'ready',
    clientId,
    name: getBakedClientName(),
    baseUrl: getPublicApiBase(clientId)
  }
}

interface TenantContextValue {
  tenant: TenantState
}

const TenantContext = createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant] = useState<TenantState>(resolveTenant)

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
