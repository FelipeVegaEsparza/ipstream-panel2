import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { isMenuItemEnabled } from '@/lib/menu-permissions'
import { getReferralDashboard } from '@/lib/referrals/dashboard'
import { ReferralProgramView } from '@/components/dashboard/referrals/ReferralProgramView'

export const dynamic = 'force-dynamic'

export default async function ReferidosPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/login')
  }

  const effectiveClient = await getEffectiveClient()
  if (!effectiveClient?.clientId) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">No se encontró tu cliente</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Contacta al soporte para asociar tu cuenta a una radio o TV.
        </p>
      </div>
    )
  }

  const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'referrals')
  if (!allowed) redirect('/dashboard')

  const data = await getReferralDashboard(effectiveClient.clientId)
  return <ReferralProgramView data={data} />
}
