// =====================================================
// /api/admin/emails/send — compositor de correos
// =====================================================
// Envía a un cliente, varios o todos. Usa una plantilla o texto libre,
// con adjunto opcional de boleta (PDF). Modo `test` envía al admin.
// Envío secuencial con throttling y log por destinatario.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emailSendSchema } from '@/lib/validations'
import { sendEmail, sendTemplateEmail } from '@/lib/resend'
import { generateAccountPdf } from '@/lib/account-pdf'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = emailSendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data

    if (!data.templateKey && !data.subject) {
      return NextResponse.json({ error: 'missing_subject', message: 'Indicá una plantilla o un asunto' }, { status: 400 })
    }

    // Resolver destinatarios
    let recipients: { id: string | null; name: string; email: string; projectName: string }[] = []

    if (data.test) {
      recipients = [{ id: null, name: 'Admin', email: session.user.email || '', projectName: 'IPStream' }]
    } else if (data.recipientType === 'all') {
      const clients = await prisma.client.findMany({
        include: { user: { select: { email: true } }, basicData: { select: { projectName: true } } },
      })
      recipients = clients
        .filter((c) => c.user.email)
        .map((c) => ({ id: c.id, name: c.name, email: c.user.email, projectName: c.basicData?.projectName || c.name }))
    } else {
      const ids = data.clientIds || []
      const clients = await prisma.client.findMany({
        where: { id: { in: ids } },
        include: { user: { select: { email: true } }, basicData: { select: { projectName: true } } },
      })
      recipients = clients
        .filter((c) => c.user.email)
        .map((c) => ({ id: c.id, name: c.name, email: c.user.email, projectName: c.basicData?.projectName || c.name }))
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'no_recipients', message: 'No hay destinatarios con correo' }, { status: 400 })
    }

    const panelUrl = process.env.NEXTAUTH_URL || 'https://panelipstream.cl'
    let sent = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i]
      try {
        let attachments: { filename: string; content: string; contentType?: string }[] | undefined
        if (data.attachBoleta && r.id) {
          const pdf = await generateAccountPdf(r.id)
          attachments = [{ filename: pdf.fileName, content: pdf.base64, contentType: 'application/pdf' }]
        }

        let result: { ok: boolean; status: string }
        if (data.templateKey) {
          result = await sendTemplateEmail({
            templateKey: data.templateKey,
            to: r.email,
            clientId: r.id,
            vars: {
              nombre: r.name,
              proyecto: r.projectName,
              mensaje: data.html || '',
              link: `${panelUrl}/dashboard`,
            },
            attachments,
          })
        } else {
          result = await sendEmail({
            to: r.email,
            subject: data.subject || '',
            html: data.html || '',
            clientId: r.id,
            attachments,
          })
        }

        if (result.status === 'sent') sent++
        else if (result.status === 'skipped') skipped++
        else failed++
      } catch {
        failed++
      }

      // Throttle para envíos masivos (evitar límite de Resend)
      if (recipients.length > 10 && i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    return NextResponse.json({ ok: true, total: recipients.length, sent, skipped, failed })
  } catch (err) {
    console.error('[emails/send POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
