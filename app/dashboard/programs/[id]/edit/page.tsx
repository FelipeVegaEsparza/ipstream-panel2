import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProgramForm } from '@/components/dashboard/ProgramForm'

interface EditProgramPageProps {
  params: {
    id: string
  }
}

export default async function EditProgramPage({ params }: EditProgramPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const program = await prisma.program.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!program) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Editar Programa
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Modifica la información del programa
        </p>
      </div>

      <div className="card max-w-2xl">
        <ProgramForm initialData={program} />
      </div>
    </div>
  )
}