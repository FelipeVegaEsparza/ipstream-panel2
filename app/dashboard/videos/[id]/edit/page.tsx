import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { VideoForm } from '@/components/dashboard/VideoForm'

interface EditVideoPageProps {
  params: {
    id: string
  }
}

export default async function EditVideoPage({ params }: EditVideoPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const video = await prisma.rankingVideo.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!video) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Editar Video
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Modifica la información del video (posición #{video.order})
        </p>
      </div>

      <div className="card max-w-2xl">
        <VideoForm initialData={video} />
      </div>
    </div>
  )
}