import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { TemplateSelector } from '@/components/dashboard/TemplateSelector'

export default async function TemplatePage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'template')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  const effectiveClient = await getEffectiveClient()
  
  if (!effectiveClient) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-4">
          No tienes un cliente asignado
        </h2>
        <p className="text-gray-400">
          Contacta al administrador
        </p>
      </div>
    )
  }

  // Obtener plantillas activas
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { displayName: 'asc' }
  })

  // Obtener plantilla actual del cliente
  const client = await prisma.client.findUnique({
    where: { id: effectiveClient.clientId },
    select: { templateId: true }
  })

  return (
    <TemplateSelector 
      templates={templates}
      currentTemplateId={client?.templateId || null}
    />
  )
}
