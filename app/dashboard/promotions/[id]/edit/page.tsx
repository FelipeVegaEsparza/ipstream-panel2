import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PromotionForm } from '@/components/dashboard/PromotionForm'

interface EditPromotionPageProps {
  params: {
    id: string
  }
}

export default async function EditPromotionPage({ params }: EditPromotionPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const promotion = await prisma.promotion.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!promotion) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Editar Promoción
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Modifica la información de la promoción
        </p>
      </div>

      <div className="card max-w-2xl">
        <PromotionForm initialData={promotion} />
      </div>
    </div>
  )
}