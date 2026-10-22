'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface DjStatus {
  active: boolean
  streamKey: string | null
  connectedAt: string | null
}

interface StreamInfo {
  streamKey: string
  rtmpUrl: string
  relayUrl: string | null
  status: string
  publicHost?: string
  dj: DjStatus
  encoder?: { status: string }
}

export default function TvConnectionPage() {
  const { t } = useDashboardI18n()
  const [info, setInfo] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedRelay, setCopiedRelay] = useState(false)
  const [copiedRelayKey, setCopiedRelayKey] = useState(false)
  const [host, setHost] = useState('panel.casterfly.com')
  // La Conexión Universal entra por el app 'relay' de SRS del servidor asignado al cliente.
  const relayHost = info?.publicHost || host
  const relayServerUrl = `rtmp://${relayHost}:1935/relay`
  const { toast } = useToast()

  useEffect(() => {
    setHost(window.location.hostname)
  }, [])

  useEffect(() => {
    fetchInfo()
    const interval = setInterval(fetchInfo, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchInfo = async () => {
    try {
      const res = await fetch('/api/dashboard/television/status')
      if (res.ok) {
        const data = await res.json()
        setInfo(data)
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  const copy = (text: string, setter: (v: boolean) => void, label: string) => {
    navigator.clipboard.writeText(text)
    setter(true)
    toast({ type: 'success', title: t('tv.connection.copied', { label }) })
    setTimeout(() => setter(false), 2000)
  }

  if (loading) return <div className="text-muted-foreground p-6">{t('tv.connection.loading')}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('tv.connection.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('tv.connection.subtitle')}
        </p>
      </div>

      {/* DJ Status */}
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 shadow-xl p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('tv.connection.djStatus')}</h2>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${info?.dj.active ? 'bg-red-500 animate-pulse' : 'bg-secondary'}`} />
          <span className={info?.dj.active ? 'text-red-300 font-medium' : 'text-muted-foreground'}>
            {info?.dj.active ? t('tv.connection.live') : t('tv.connection.noDj')}
          </span>
        </div>
        {info?.dj.active && info.dj.connectedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('tv.connection.connectedSince', { time: new Date(info.dj.connectedAt).toLocaleString('es-CL') })}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className={`w-2.5 h-2.5 rounded-full ${info?.status === 'autodj' ? 'bg-green-500 animate-pulse' : 'bg-secondary'}`} />
          <span className={info?.status === 'autodj' ? 'text-green-300 text-sm font-medium' : 'text-muted-foreground text-sm'}>
            {info?.status === 'autodj' ? t('tv.connection.autodjActive') : info?.status === 'off' ? t('tv.connection.autodjStopped') : t('tv.connection.autodjStoppedDj')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t('tv.connection.autodjNote')}
        </p>
      </div>

      {/* Conexión Universal (H.264 estándar; HEVC/AV1 por enhanced RTMP se descartan en ingesta con SRS v5) */}
      {info && (
        <>
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 shadow-xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('tv.connection.universalTitle')}</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-green-300 text-sm font-medium">{t('tv.connection.relayActive')}</span>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input
                type="text"
                readOnly
                value={relayServerUrl}
                className="flex-1 bg-background text-brand px-3 py-2.5 rounded-lg border border-border font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => copy(relayServerUrl, setCopiedRelay, t('tv.connection.relayServer'))}
                className="px-4 py-2.5 bg-secondary hover:bg-secondary text-foreground rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedRelay ? t('tv.copied') : t('tv.connection.copyRelay')}
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={info.streamKey}
                className="flex-1 bg-background text-brand px-3 py-2.5 rounded-lg border border-border font-mono text-sm outline-none"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => copy(info.streamKey, setCopiedRelayKey, t('tv.connection.streamKey'))}
                className="px-4 py-2.5 bg-secondary hover:bg-secondary text-foreground rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {copiedRelayKey ? t('tv.copied') : t('tv.connection.copyKey')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('tv.connection.relayInstructions')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
