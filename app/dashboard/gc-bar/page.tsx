import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { GcBarManager } from '@/components/dashboard/GcBarManager'

export default async function GcBarPage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'gc-bar')
      if (!allowed) redirect('/dashboard')
    }
  }

  const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
  const effectiveClient = await getEffectiveClient()
  if (!effectiveClient) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const messages = await prisma.gcBarMessage.findMany({
    where: { clientId: effectiveClient.clientId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Barra GC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra los mensajes o frases de la Barra GC. Se exponen por la API pública de tu sitio.
        </p>
      </div>
      <GcBarManager messages={messages} />
    </div>
  )
}
