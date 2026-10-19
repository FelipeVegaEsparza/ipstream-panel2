import { LocutorIaSettings } from '@/components/dashboard/streaming/locutor-ia/LocutorIaSettings'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDisabledMenuItems } from '@/lib/menu-permissions'

export const dynamic = 'force-dynamic'

export default async function LocutorIaPage() {
  const client = await getEffectiveClient()
  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">No autorizado.</div>
  }

  const disabled = await getDisabledMenuItems(client.clientId)
  if (disabled.has('streaming-locutor-ia')) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">Locutor IA</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección no está incluida en tu plan actual. Contactá al administrador para habilitarla.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
          Locutor IA
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configurá la voz del presentador, la frecuencia, las frases y el AutoDJ. Los jingles
          normales quedan separados.
        </p>
      </div>
      <LocutorIaSettings />
    </div>
  )
}
