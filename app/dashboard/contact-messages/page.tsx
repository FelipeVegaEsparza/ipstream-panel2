import { redirect } from 'next/navigation'
import { ContactMessagesView } from '@/components/dashboard/ContactMessagesView'

export const dynamic = 'force-dynamic'

export default async function ContactMessagesPage() {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'contact-messages')
      if (!allowed) redirect('/dashboard')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mensajes de contacto</h1>
        <p className="mt-1 text-sm text-gray-600">
          Consultas enviadas desde el formulario de contacto de tu sitio web
        </p>
      </div>
      <ContactMessagesView />
    </div>
  )
}
