import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { GalleryForm } from '@/components/dashboard/GalleryForm'

interface EditGalleryPageProps {
  params: {
    id: string
  }
}

export default async function EditGalleryPage({ params }: EditGalleryPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const gallery = await prisma.gallery.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    },
    include: {
      images: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!gallery) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Galería</h1>
        <p className="mt-1 text-sm text-gray-600">
          Modifica la información y las imágenes de la galería
        </p>
      </div>

      <div className="card max-w-2xl">
        <GalleryForm initialData={gallery} />
      </div>
    </div>
  )
}
