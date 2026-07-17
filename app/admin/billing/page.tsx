import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlansManager } from '@/components/admin/PlansManager'
import { ClientesTable, type ClientesTableProps } from '@/components/admin/ClientesTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function BillingPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">Acceso no autorizado</div>
  }

  const [plans, clients] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { clients: true, subscriptions: true } },
      },
    }),
    prisma.client.findMany({
      include: {
        user: true,
        plan: true,
        subscription: {
          include: {
            payments: { orderBy: { dueDate: 'desc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const disabledCounts = await prisma.clientMenuItem.groupBy({
    by: ['clientId'],
    where: { enabled: false },
    _count: { _all: true },
  })
  const disabledCountMap = new Map(
    disabledCounts.map((d) => [d.clientId, d._count._all])
  )

  const clientesData: ClientesTableProps['clients'] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.user.email,
    phone: c.phone,
    disabledMenuCount: disabledCountMap.get(c.id) ?? 0,
    plan: c.plan
      ? {
          id: c.plan.id,
          name: c.plan.name,
          price: c.plan.price,
          currency: c.plan.currency,
          interval: c.plan.interval,
        }
      : null,
    subscription: c.subscription
      ? {
          id: c.subscription.id,
          status: c.subscription.status,
          startDate: c.subscription.startDate,
          endDate: c.subscription.endDate,
        }
      : null,
    payments: c.subscription?.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      dueDate: p.dueDate,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      paymentMethod: p.paymentMethod,
      description: p.description,
      receiptUrl: p.receiptUrl,
    })) ?? [],
  }))

  const planesData: ClientesTableProps['plans'] = plans
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      interval: p.interval,
      description: p.description,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Planes y Pagos</h1>
        <p className="text-gray-400 mt-1">
          Gestiona los planes que ofreces y los pagos de tus clientes.
        </p>
      </div>

      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-800 border border-gray-700">
          <TabsTrigger value="clientes" className="data-[state=active]:bg-blue-600">
            Clientes y pagos
          </TabsTrigger>
          <TabsTrigger value="planes" className="data-[state=active]:bg-blue-600">
            Planes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-6">
          <ClientesTable clients={clientesData} plans={planesData} />
        </TabsContent>

        <TabsContent value="planes" className="space-y-6">
          <PlansManager plans={plans} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
