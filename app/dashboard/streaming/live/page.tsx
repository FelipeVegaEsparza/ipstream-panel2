import { LiveConsole } from '@/components/dashboard/streaming/live/LiveConsole'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDisabledMenuItems } from '@/lib/menu-permissions'
import { hasConfiguredPremiumTts } from '@/lib/premium-tts'
import { getAiLiveAccess } from '@/lib/ai-live'
import { prisma } from '@/lib/prisma'

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

  const [premiumTtsConfigured, aiAccess, clientInfo] = await Promise.all([
    hasConfiguredPremiumTts(),
    getAiLiveAccess(client.clientId),
    prisma.client.findUnique({
      where: { id: client.clientId },
      select: {
        name: true,
        timezone: true,
        basicData: { select: { projectName: true } },
        radioStream: {
          select: {
            aiPresenterEnabled: true,
            aiPresenterEvery: true,
            aiIntroPhrases: true,
          },
        },
      },
    }),
  ])
  const aiEnabled = aiAccess.enabled
  const premiumVoiceAvailable = Boolean(premiumTtsConfigured && aiEnabled)
  const stationName = clientInfo?.basicData?.projectName || clientInfo?.name || 'la radio'
  let aiIntroPhrases: string[] = []
  try {
    const parsed = clientInfo?.radioStream?.aiIntroPhrases
      ? JSON.parse(clientInfo.radioStream.aiIntroPhrases)
      : []
    if (Array.isArray(parsed)) {
      aiIntroPhrases = parsed.filter((phrase): phrase is string => typeof phrase === 'string')
    }
  } catch {}

  return (
    <LiveConsole
      premiumVoiceAvailable={premiumVoiceAvailable}
      aiEnabled={aiEnabled}
      stationName={stationName}
      aiRemaining={aiAccess.remaining}
      aiLimit={aiAccess.limit}
      aiPresenterEnabled={Boolean(clientInfo?.radioStream?.aiPresenterEnabled)}
      aiPresenterEvery={clientInfo?.radioStream?.aiPresenterEvery ?? 3}
      aiIntroPhrases={aiIntroPhrases}
      timezone={clientInfo?.timezone}
    />
  )
}
