import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

interface NewsDetailPageProps {
  params: {
    id: string
  }
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>Error: No se encontró información del cliente</div>
  }

  const news = await prisma.news.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!news) {
    notFound()
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/news"
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vista de Noticia
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Previsualización de cómo se ve la noticia
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/news/${news.id}/edit`}
          className="btn-primary flex items-center gap-2"
        >
          <PencilIcon className="h-5 w-5" />
          Editar
        </Link>
      </div>

      <div className="card max-w-4xl">
        <article className="prose prose-lg max-w-none">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {news.name}
            </h1>
            
            <div className="flex items-center text-sm text-gray-500 space-x-4 mb-6">
              <span>Publicado: {formatDate(news.createdAt)}</span>
              <span>•</span>
              <span>Slug: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{news.slug}</code></span>
            </div>

            {news.imageUrl && (
              <div className="mb-6">
                <Image
                  src={news.imageUrl}
                  alt={news.name}
                  width={800}
                  height={400}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Resumen:</h3>
              <p className="text-gray-600 italic">
                {news.shortText}
              </p>
            </div>
          </header>

          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {news.longText}
          </div>
        </article>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          URL de la API REST
        </h3>
        <div className="space-y-2">
          <div>
            <span className="text-xs text-blue-600">Noticia individual:</span>
            <code className="block bg-blue-100 px-3 py-2 rounded text-sm text-blue-900 mt-1">
              GET /api/public/{session.user.clientId}/news/{news.slug}
            </code>
          </div>
          <div>
            <span className="text-xs text-blue-600">Todas las noticias:</span>
            <code className="block bg-blue-100 px-3 py-2 rounded text-sm text-blue-900 mt-1">
              GET /api/public/{session.user.clientId}/news
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}