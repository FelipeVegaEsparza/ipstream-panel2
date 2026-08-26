// =====================================================
// /api/webhooks/resend — estado de envíos (rastreo)
// =====================================================
// Recibe los eventos de Resend (sent/delivered/bounced/opened/clicked/...)
// y actualiza el EmailLog correspondiente. Verifica la firma Svix; las
// peticiones sin firma válida se rechazan sin tocar el historial.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ''

const STATUS_MAP: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
}

function verifySvix(rawBody: string, headers: Headers): boolean {
  if (!WEBHOOK_SECRET) return false
  const id = headers.get('svix-id')
  const ts = headers.get('svix-timestamp')
  const sigHeader = headers.get('svix-signature')
  if (!id || !ts || !sigHeader) return false

  const signedContent = `${id}.${ts}.${rawBody}`
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(signedContent).digest('base64')

  // svix-signature puede traer varias firmas separadas por espacio: "v1,xxx v1,yyy"
  return sigHeader.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) return false
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifySvix(rawBody, request.headers)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const status = STATUS_MAP[payload?.type]
  const resendId = payload?.data?.email_id || payload?.data?.id
  if (!status || !resendId) {
    return NextResponse.json({ ok: true })
  }

  await prisma.emailLog.updateMany({
    where: { resendId },
    data: {
      status,
      ...(status === 'opened' ? { openedAt: new Date() } : {}),
      ...(status === 'clicked' ? { clickedAt: new Date() } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}
