'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon, EyeIcon, ChartBarIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface PollOption {
  id: string
  text: string
  votes: number
}

interface Poll {
  id: string
  title: string
  active: boolean
  options: PollOption[]
  createdAt: Date
}

interface PollsListProps {
  polls: Poll[]
}

export function PollsList({ polls }: PollsListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta encuesta?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/polls/${id}`, { method: 'DELETE' })
      if (res.ok) window.location.reload()
      else alert('Error al eliminar')
    } catch {
      alert('Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    setToggling(id)
    try {
      const res = await fetch(`/api/polls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })
      if (res.ok) window.location.reload()
      else alert('Error al cambiar estado')
    } catch {
      alert('Error al cambiar estado')
    } finally {
      setToggling(null)
    }
  }

  const totalVotes = (options: PollOption[]) => options.reduce((sum, o) => sum + o.votes, 0)
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date))

  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-medium text-primary mb-2">No hay encuestas</h3>
        <p className="text-secondary mb-4">Crea tu primera encuesta para los oyentes</p>
        <Link href="/dashboard/polls/new" className="btn-primary">Crear Encuesta</Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {polls.map((poll) => {
        const total = totalVotes(poll.options)
        return (
          <div key={poll.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-primary flex-1">{poll.title}</h3>
              <button
                onClick={() => handleToggle(poll.id, poll.active)}
                disabled={toggling === poll.id}
                className={`ml-2 p-1.5 rounded-full ${poll.active ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-400'}`}
                title={poll.active ? 'Desactivar' : 'Activar'}
              >
                {toggling === poll.id ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : poll.active ? (
                  <CheckCircleIcon className="h-5 w-5" />
                ) : (
                  <XCircleIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {poll.options.map((opt) => {
                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-secondary">{opt.text}</span>
                      <span className="text-muted">{opt.votes} voto{opt.votes !== 1 ? 's' : ''} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-muted mb-3">
              <span>{total} voto{total !== 1 ? 's' : ''}</span>
              <span className={poll.active ? 'text-green-400' : 'text-gray-500'}>
                {poll.active ? 'Activa' : 'Inactiva'}
              </span>
              <span>{formatDate(poll.createdAt)}</span>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-700">
              <Link href={`/dashboard/polls/${poll.id}`} className="action-button action-button-view" title="Ver encuesta">
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link href={`/dashboard/polls/${poll.id}/edit`} className="action-button action-button-edit" title="Editar encuesta">
                <PencilIcon className="h-4 w-4" />
              </Link>
              <button onClick={() => handleDelete(poll.id)} disabled={deleting === poll.id} className="action-button action-button-delete" title="Eliminar encuesta">
                {deleting === poll.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
