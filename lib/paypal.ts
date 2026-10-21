// =====================================================
// PayPal — Orders API v2 (pago por período)
// =====================================================
// Credenciales por entorno. Sin credenciales, `paypalEnabled()` es false y la
// UI no ofrece PayPal (el resto de la facturación sigue igual).
// Nota: PayPal NO soporta CLP; se ofrece solo para monedas soportadas (USD, …).

const CFG = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  secret: process.env.PAYPAL_CLIENT_SECRET || '',
  env: (process.env.PAYPAL_ENV || 'sandbox').toLowerCase(),
  webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
}

// Monedas que PayPal soporta como transacción (subset relevante).
export const PAYPAL_CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK']

export function paypalEnabled(): boolean {
  return Boolean(CFG.clientId && CFG.secret)
}

export function isPaypalCurrency(currency: string): boolean {
  return PAYPAL_CURRENCIES.includes(currency.toUpperCase())
}

function baseUrl(): string {
  return CFG.env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

async function accessToken(): Promise<string> {
  const auth = Buffer.from(`${CFG.clientId}:${CFG.secret}`).toString('base64')
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`PayPal auth ${res.status}`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

export interface CreateOrderInput {
  amount: number
  currency: string
  referenceId: string
  returnUrl: string
  cancelUrl: string
}

export async function createPaypalOrder(input: CreateOrderInput): Promise<{ id: string; approvalUrl: string | null }> {
  const token = await accessToken()
  const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: input.currency.toUpperCase(), value: input.amount.toFixed(2) },
          reference_id: input.referenceId,
          custom_id: input.referenceId,
        },
      ],
      application_context: {
        brand_name: 'CasterFly',
        user_action: 'PAY_NOW',
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
    signal: AbortSignal.timeout(15000),
  })
  const data = (await res.json()) as { id: string; links?: Array<{ rel: string; href: string }> }
  if (!res.ok) throw new Error(`PayPal createOrder ${res.status}: ${JSON.stringify(data).slice(0, 300)}`)
  const approvalUrl = data.links?.find((l) => l.rel === 'approve')?.href ?? data.links?.find((l) => l.rel === 'payer-action')?.href ?? null
  return { id: data.id, approvalUrl }
}

export interface CaptureResult {
  completed: boolean
  captureId: string | null
  referenceId: string | null
}

export async function capturePaypalOrder(orderId: string): Promise<CaptureResult> {
  const token = await accessToken()
  const res = await fetch(`${baseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  const data = (await res.json()) as {
    status?: string
    purchase_units?: Array<{
      reference_id?: string
      custom_id?: string
      payments?: { captures?: Array<{ id: string; status?: string; custom_id?: string }> }
    }>
  }
  if (!res.ok) throw new Error(`PayPal capture ${res.status}: ${JSON.stringify(data).slice(0, 300)}`)
  const pu = data.purchase_units?.[0]
  const cap = pu?.payments?.captures?.[0]
  return {
    completed: data.status === 'COMPLETED' || cap?.status === 'COMPLETED',
    captureId: cap?.id ?? null,
    referenceId: pu?.reference_id ?? cap?.custom_id ?? null,
  }
}

/** Verifica la firma de un webhook de PayPal (requiere PAYPAL_WEBHOOK_ID). */
export async function verifyPaypalWebhook(headers: Headers, event: unknown): Promise<boolean> {
  if (!CFG.webhookId) return false
  const token = await accessToken()
  const res = await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: CFG.webhookId,
      webhook_event: event,
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { verification_status?: string }
  return data.verification_status === 'SUCCESS'
}
