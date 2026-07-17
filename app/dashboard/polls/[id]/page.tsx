import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PencilIcon, ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface PollDetailPageProps {
  params: { id: string }
}

export default async function PollDetailPage({ params }: PollDetailPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>Error: No se encontró información del cliente</div>

  const poll = await prisma.poll.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
    include: { options: true },
  })

  if (!poll) notFound()

  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/polls" className="p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resultados de Encuesta</h1>
            <p className="mt-1 text-sm text-gray-600">Resultados en tiempo real</p>
          </div>
        </div>
        <Link href={`/dashboard/polls/${poll.id}/edit`} className="btn-primary flex items-center gap-2">
          <PencilIcon className="h-5 w-5" /> Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{poll.title}</h2>

            <div className="space-y-4">
              {poll.options
                .sort((a, b) => b.votes - a.votes)
                .map((opt, i) => {
                  const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
                  return (
                    <div key={opt.id}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${i === 0 && totalVotes > 0 ? 'text-cyan-400' : 'text-gray-700'}`}>
                            {i + 1}
                          </span>
                          <span className="text-gray-800 font-medium">{opt.text}</span>
                        </div>
                        <span className="text-sm text-gray-500">{opt.votes} votos ({pct}%)</span>
                      </div>
                      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${i === 0 && totalVotes > 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>

            <p className="text-sm text-gray-400 mt-6">Total: {totalVotes} voto{totalVotes !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Estado:</span>
                <p className={`text-sm font-medium ${poll.active ? 'text-green-600' : 'text-red-600'}`}>
                  {poll.active ? 'Activa' : 'Inactiva'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Opciones:</span>
                <p className="text-sm font-medium text-gray-900">{poll.options.length}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Votos totales:</span>
                <p className="text-sm font-medium text-gray-900">{totalVotes}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Creada:</span>
                <p className="text-sm font-medium text-gray-900">{formatDate(poll.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones</h3>
            <Link href={`/dashboard/polls/${poll.id}/edit`} className="w-full btn-primary flex items-center justify-center gap-2">
              <PencilIcon className="h-4 w-4" /> Editar encuesta
            </Link>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">API REST</h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-blue-600">Obtener encuestas activas:</span>
                <code className="block bg-blue-100 px-3 py-2 rounded text-xs text-blue-900 mt-1 break-all">
                  GET /api/public/{session.user.clientId}/polls
                </code>
              </div>
              <div>
                <span className="text-xs text-blue-600">Votar:</span>
                <code className="block bg-blue-100 px-3 py-2 rounded text-xs text-blue-900 mt-1 break-all">
                  POST /api/public/{session.user.clientId}/polls/ID_ENCUESTA/vote{'\n'}{'{ "optionId": "ID_OPCION" }'}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
