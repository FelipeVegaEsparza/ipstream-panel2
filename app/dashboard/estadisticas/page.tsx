import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { prisma } from '@/lib/prisma'
import AnalyticsView from '@/components/dashboard/analytics/AnalyticsView'

export const dynamic = 'force-dynamic'

export default async function EstadisticasPage() {
  const effective = await getEffectiveClient()
  const services = effective
    ? (await prisma.client.findUnique({
        where: { id: effective.clientId },
        select: { plan: { select: { services: true } } },
      }))?.plan?.services || 'both'
    : 'both'

  const hasRadio = services === 'radio' || services === 'both'
  const hasTv = services === 'tv' || services === 'both'

  return <AnalyticsView hasRadio={hasRadio} hasTv={hasTv} />
}
