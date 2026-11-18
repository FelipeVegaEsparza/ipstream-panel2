import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminReferralData } from '@/lib/referrals/admin'
import { AdminReferralsView } from '@/components/admin/referrals/AdminReferralsView'

export const dynamic = 'force-dynamic'

export default async function AdminReferralsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="p-6 text-sm text-danger">No autorizado</div>
  }

  const data = await getAdminReferralData({ pageSize: 300 })
  return <AdminReferralsView data={data} />
}
