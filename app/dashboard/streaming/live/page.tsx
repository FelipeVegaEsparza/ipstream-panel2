import { LiveConsole } from '@/components/dashboard/streaming/live/LiveConsole'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDisabledMenuItems } from '@/lib/menu-permissions'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'

export const dynamic = 'force-dynamic'

export default async function LivePage() {
  const client = await getEffectiveClient()
  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">No autorizado.</div>
  }

  const disabled = await getDisabledMenuItems(client.clientId)
  if (disabled.has('streaming-live')) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">Transmitir en vivo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección no está incluida en tu plan actual. Contactá al administrador para habilitarla.
        </p>
      </div>
    )
  }

  const elevenLabs = await getElevenLabsConfig()
  const premiumVoiceAvailable = Boolean(
    elevenLabs.enabled && elevenLabs.apiKey && elevenLabs.voiceId
  )

  return <LiveConsole premiumVoiceAvailable={premiumVoiceAvailable} />
}
