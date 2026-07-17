const STORAGE_PREFIX = 'ticket_read_'

export function getTicketLastRead(ticketId: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const val = localStorage.getItem(STORAGE_PREFIX + ticketId)
    return val ? parseInt(val, 10) : 0
  } catch {
    return 0
  }
}

export function markTicketRead(ticketId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + ticketId, Date.now().toString())
  } catch {}
}
