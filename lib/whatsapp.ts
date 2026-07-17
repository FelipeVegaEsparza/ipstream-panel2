/**
 * Normaliza un número de teléfono chileno a formato E.164 sin el '+'.
 * - Acepta: 912345678, +56912345678, 56912345678, +56 9 1234 5678, (9) 1234-5678
 * - Devuelve: 56912345678 o null si es inválido
 */
export function normalizeChileanPhone(input: string | null | undefined): string | null {
  if (!input) return null

  const digits = input.replace(/\D/g, '')

  if (digits.length === 0) return null

  let normalized: string
  if (digits.startsWith('56')) {
    normalized = digits
  } else if (digits.startsWith('9') && digits.length === 9) {
    normalized = `56${digits}`
  } else if (digits.length === 8) {
    normalized = `569${digits}`
  } else {
    return null
  }

  if (normalized.length < 11 || normalized.length > 13) return null

  return normalized
}

/**
 * Construye una URL wa.me/ con el teléfono y mensaje pre-armado.
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  const normalized = normalizeChileanPhone(phone)
  if (!normalized) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

/**
 * Mensaje por defecto para la cuenta del mes.
 */
export function defaultAccountMessage(clientName: string): string {
  return `Hola${clientName ? ` ${clientName.split(' ')[0]}` : ''}! Te adjunto la cuenta del mes con el detalle de tu plan y los pagos. Cualquier duda, me avisas.`
}
