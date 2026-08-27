import { Check, X, Radio, MonitorPlay, HardDrive } from 'lucide-react'

interface PlanServicesCardProps {
  plan: {
    name: string
    services: string
    radioStorageQuotaMB: number | null
    videoStorageQuotaMB: number | null
    interval: string
    price: number
    currency: string
  } | null
}

const RADIO_SECTIONS = ['Streaming', 'Biblioteca', 'Playlists', 'Conexión DJ', 'Jingles', 'Programación', 'Estadísticas']
const TV_SECTIONS = ['Transmisión', 'Conexión OBS', 'Videoteca', 'Programación TV', 'Parrilla']

function fmtMB(mb: number | null) {
  if (mb === null || mb === undefined) return 'Ilimitado'
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb} MB`
}

export function PlanServicesCard({ plan }: PlanServicesCardProps) {
  if (!plan) {
    return (
      <div className="bg-gray-800/80 rounded-2xl border border-gray-700/50 p-5">
        <p className="text-sm text-gray-400">
          Sin plan asignado. {''}
          <span className="text-cyan-400">Contactá al soporte para activar tu plan.</span>
        </p>
      </div>
    )
  }

  const hasRadio = plan.services !== 'tv'
  const hasTv = plan.services !== 'radio'

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl border border-gray-700/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">Mi Plan</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
            {plan.services === 'radio' ? 'Solo Radio' : plan.services === 'tv' ? 'Solo TV' : 'Radio + TV'}
          </span>
        </div>
        <span className="text-sm text-gray-400">
          <span className="font-semibold text-white">{plan.name}</span> ·{' '}
          {plan.interval === 'monthly' ? 'mensual' : 'anual'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-gray-800/70 border border-gray-700 p-4">
          <p className="text-sm font-medium text-cyan-300 flex items-center gap-1.5 mb-2">
            <Radio className="h-4 w-4" /> Radio
          </p>
          {hasRadio ? (
            <ul className="space-y-1">
              {RADIO_SECTIONS.map((s) => (
                <li key={s} className="flex items-center gap-1.5 text-xs text-gray-300">
                  <Check className="h-3 w-3 text-green-400" /> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <X className="h-3 w-3 text-red-400" /> No incluida en tu plan
            </p>
          )}
        </div>

        <div className="rounded-lg bg-gray-800/70 border border-gray-700 p-4">
          <p className="text-sm font-medium text-purple-300 flex items-center gap-1.5 mb-2">
            <MonitorPlay className="h-4 w-4" /> Televisión
          </p>
          {hasTv ? (
            <ul className="space-y-1">
              {TV_SECTIONS.map((s) => (
                <li key={s} className="flex items-center gap-1.5 text-xs text-gray-300">
                  <Check className="h-3 w-3 text-green-400" /> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <X className="h-3 w-3 text-red-400" /> No incluida en tu plan
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
          Almacenamiento radio: <span className="text-white font-medium">{fmtMB(plan.radioStorageQuotaMB)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
          Almacenamiento video: <span className="text-white font-medium">{fmtMB(plan.videoStorageQuotaMB)}</span>
        </span>
      </div>
    </div>
  )
}
