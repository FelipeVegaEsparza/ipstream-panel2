'use client'

import { SparklesIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

interface Props {
  presenterEnabled: boolean
  every: number
  generating: boolean
  error: string | null
  remaining: number
  limit: number
  onToggle: (enabled: boolean) => void
  onEvery: (every: number) => void
  onOpenComposer: () => void
}

export function AiPresenterCard({
  presenterEnabled,
  every,
  generating,
  error,
  remaining,
  limit,
  onToggle,
  onEvery,
  onOpenComposer,
}: Props) {
  return (
    <aside className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Presentador IA</h2>
        </div>
        <input
          type="checkbox"
          checked={presenterEnabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border bg-secondary"
          aria-label="Activar presentador IA"
        />
      </div>

      <p className="text-[10px] leading-snug text-muted-foreground">
        Presenta el próximo tema con la voz de la emisora.
      </p>

      <label className="space-y-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Cada</span>
        <select
          value={every}
          onChange={(event) => onEvery(Number(event.target.value))}
          disabled={!presenterEnabled}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-brand disabled:opacity-40"
          aria-label="Cada cuántos temas presenta"
        >
          {[2, 3, 4, 5, 6].map((value) => (
            <option key={value} value={value}>
              {value} temas
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg bg-secondary/60 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
        {generating
          ? 'Generando presentación…'
          : presenterEnabled
            ? `Se presenta antes del tema ${every + 1}.`
            : 'Presentador apagado.'}
      </div>

      <button
        type="button"
        onClick={onOpenComposer}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <PencilSquareIcon className="h-3.5 w-3.5" />
        Crear locución libre
      </button>

      {error && <p className="text-[10px] leading-snug text-red-300">{error}</p>}

      <p className="mt-auto pt-1 text-[9px] leading-snug text-muted-foreground">
        Cuota IA: {remaining.toLocaleString('es-CL')} / {limit.toLocaleString('es-CL')} caracteres.
      </p>
    </aside>
  )
}
