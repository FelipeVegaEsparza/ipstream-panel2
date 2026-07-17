export const TICKET_STATUS = {
  open: { label: 'Abierto', color: 'bg-green-600/20 text-green-300 border-green-600/30' },
  in_progress: { label: 'En progreso', color: 'bg-orange-600/20 text-orange-300 border-orange-600/30' },
  closed: { label: 'Cerrado', color: 'bg-gray-600/20 text-gray-300 border-gray-600/30' },
} as const

export const TICKET_PRIORITY = {
  low: { label: 'Baja', color: 'bg-gray-600/20 text-gray-300 border-gray-600/30' },
  normal: { label: 'Normal', color: 'bg-blue-600/20 text-blue-300 border-blue-600/30' },
  high: { label: 'Alta', color: 'bg-orange-600/20 text-orange-300 border-orange-600/30' },
  urgent: { label: 'Urgente', color: 'bg-red-600/20 text-red-300 border-red-600/30' },
} as const

export type TicketStatus = keyof typeof TICKET_STATUS
export type TicketPriority = keyof typeof TICKET_PRIORITY
