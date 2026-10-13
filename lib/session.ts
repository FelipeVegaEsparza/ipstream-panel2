import { cache } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Deduplica la resolución de la sesión dentro de un mismo request: cualquier
// evaluación posterior en el mismo request reutiliza el resultado en lugar de
// volver a verificar el JWT. Soportado en Route Handlers y Server Components.
export const getSession = cache(() => getServerSession(authOptions))
