import Link from 'next/link'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface Props {
  limit: number
  used: number
  remaining: number
  period: string
  compact?: boolean
}

function monthLabel(period: string): string {
  try {
    return new Date(`${period}-01T00:00:00Z`).toLocaleDateString('es-CL', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return period
  }
}

export function AiCreditsCard({ limit, used, remaining, period, compact = false }: Props) {
  if (limit <= 0) return null
  const percent = Math.min(100, Math.round((used / limit) * 100))

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-brand/10 p-2 text-brand">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Créditos Locutor IA</h2>
            <p className="text-xs text-muted-foreground">
              Caracteres de voz premium · {monthLabel(period)}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/streaming/locutor-ia"
          className="text-xs font-medium text-brand hover:underline"
        >
          Configurar
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Asignados</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
            {limit.toLocaleString('es-CL')}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Usados</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-foreground">
            {used.toLocaleString('es-CL')}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponibles</p>
          <p className="mt-0.5 font-mono text-lg font-semibold text-brand">
            {remaining.toLocaleString('es-CL')}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${percent >= 90 ? 'bg-red-400' : 'bg-brand'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Los audios repetidos desde el caché no consumen créditos.
        </p>
      )}
    </section>
  )
}
