import { useEffect } from 'react'
import { ensurePwaRegistered } from './register'

export function usePwaRegistration(clientId: string): void {
  useEffect(() => {
    if (!clientId) return
    void ensurePwaRegistered(clientId)
  }, [clientId])
}
