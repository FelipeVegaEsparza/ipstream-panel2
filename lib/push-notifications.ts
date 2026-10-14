import { decrypt, isEncrypted } from '@/lib/encryption'

/**
 * Envío de notificaciones push vía OneSignal (server-only).
 *
 * Este helper es el único punto del panel que llama a la API de OneSignal.
 * Concentra: desencriptado de la API Key del cliente, plataforma web, icono,
 * `data.notificationId` (para el tracking de clicks) y normalización del
 * resultado. Lo consumen la ruta del dashboard y el cron de programadas.
 *
 * Contrato:
 * - `sendPushNotification(client, input)` NUNCA lanza; siempre resuelve un
 *   `SendPushNotificationResult`.
 * - `ok: true` implica que OneSignal aceptó la petición; `id` y `recipients`
 *   vienen de su respuesta.
 * - `ok: false` trae un `error` legible (config faltante, rechazo de OneSignal
 *   o fallo de conexión).
 */

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications'

export interface PushNotificationClient {
  oneSignalAppId?: string | null
  oneSignalApiKey?: string | null
}

export interface SendPushNotificationInput {
  /** ID propio del panel; viaja en `data.notificationId` para atribuir clicks. */
  notificationId: string
  title: string
  message: string
  imageUrl?: string | null
  targetUrl?: string | null
  /** Icono del push web (por cliente). Si falta, OneSignal usa su default. */
  iconUrl?: string | null
}

export interface SendPushNotificationResult {
  ok: boolean
  /** ID de la notificación en OneSignal. */
  id: string | null
  recipients: number
  error: string | null
}

function resolveApiKey(stored: string): string {
  try {
    return isEncrypted(stored) ? decrypt(stored) : stored
  } catch {
    return stored
  }
}

function extractError(data: unknown): string {
  const errors = (data as { errors?: unknown } | null)?.errors
  if (Array.isArray(errors) && errors.length > 0) return String(errors[0])
  if (typeof errors === 'string' && errors.length > 0) return errors
  return 'Error al enviar la notificación'
}

export async function sendPushNotification(
  client: PushNotificationClient,
  input: SendPushNotificationInput
): Promise<SendPushNotificationResult> {
  const appId = client.oneSignalAppId
  const storedKey = client.oneSignalApiKey

  if (!appId || !storedKey) {
    return {
      ok: false,
      id: null,
      recipients: 0,
      error: 'OneSignal no está configurado para este cliente',
    }
  }

  const payload: Record<string, unknown> = {
    app_id: appId,
    included_segments: ['All'],
    // El canal es web/PWA: no entregar a plataformas no usadas.
    isAnyWeb: true,
    headings: { en: input.title },
    contents: { en: input.message },
    data: { notificationId: input.notificationId },
  }

  if (input.imageUrl) payload.big_picture = input.imageUrl
  if (input.targetUrl) payload.url = input.targetUrl
  if (input.iconUrl) {
    payload.chrome_web_icon = input.iconUrl
    payload.chrome_web_badge = input.iconUrl
  }

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${resolveApiKey(storedKey)}`,
      },
      body: JSON.stringify(payload),
    })

    const data: unknown = await response.json().catch(() => null)

    if (response.ok && data) {
      const body = data as { id?: string; recipients?: number }
      return {
        ok: true,
        id: body.id ?? null,
        recipients: body.recipients ?? 0,
        error: null,
      }
    }

    return { ok: false, id: null, recipients: 0, error: extractError(data) }
  } catch {
    return {
      ok: false,
      id: null,
      recipients: 0,
      error: 'Error de conexión con OneSignal',
    }
  }
}
