import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { SponsorForm } from '@/components/dashboard/SponsorForm'

interface EditSponsorPageProps {
  params: {
    id: string
  }
}

export default async function EditSponsorPage({ params }: EditSponsorPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const sponsor = await prisma.sponsor.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!sponsor) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Editar Auspiciador
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Modifica la información del auspiciador
        </p>
      </div>

      <div className="card max-w-4xl">
        <SponsorForm initialData={sponsor} />
      </div>
    </div>
  )
}