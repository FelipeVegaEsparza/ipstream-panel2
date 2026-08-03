import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SocialNetworksForm } from '@/components/dashboard/SocialNetworksForm'

export default async function SocialNetworksPage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'social-networks')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const socialNetworks = await prisma.socialNetworks.findUnique({
    where: { clientId: session.user.clientId }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Redes Sociales
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Configura los enlaces a tus redes sociales
        </p>
      </div>

      <div className="card max-w-2xl">
        <SocialNetworksForm initialData={socialNetworks} />
      </div>
    </div>
  )
}