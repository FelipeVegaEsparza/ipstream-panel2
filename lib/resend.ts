// =====================================================
// Email — motor de envío vía Resend
// =====================================================
// Envía correos transaccionales, registra cada envío en EmailLog y
// aísla errores: NUNCA lanza para no romper la operación de negocio
// que lo disparó (pagos, tickets).

import { prisma } from '@/lib/prisma'
import { renderTemplate } from './email-templates'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'no-reply@ipstream.cl'
const RESEND_API_URL = 'https://api.resend.com/emails'

export interface EmailAttachment {
  filename: string
  content: string // base64
  contentType?: string
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  templateKey?: string
  clientId?: string | null
  attachments?: EmailAttachment[]
}

/**
 * Envía un correo y registra el resultado en EmailLog.
 * Nunca lanza excepciones: devuelve { ok, status, resendId?, logId? }.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; status: string; resendId?: string | null; logId?: string }> {
  const { to, subject, html, templateKey, clientId, attachments } = params

  // Registrar el intento antes de llamar al proveedor
  const log = await prisma.emailLog.create({
    data: {
      clientId: clientId || null,
      to,
      from: RESEND_FROM_EMAIL,
      subject: subject.slice(0, 191),
      templateKey: templateKey || null,
      status: 'sent',
      sentAt: new Date(),
    },
  })

  if (!RESEND_API_KEY) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'skipped', error: 'RESEND_API_KEY no configurada' },
    })
    return { ok: false, status: 'skipped', logId: log.id }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType || 'application/pdf',
        })),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'failed', error: `HTTP ${res.status}: ${body.slice(0, 300)}` },
      })
      return { ok: false, status: 'failed', logId: log.id }
    }

    const data = await res.json()
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { resendId: data?.id || null },
    })
    return { ok: true, status: 'sent', resendId: data?.id, logId: log.id }
  } catch (err) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: 'failed', error: (err as Error).message.slice(0, 300) },
    })
    return { ok: false, status: 'failed', logId: log.id }
  }
}

/**
 * Envía usando una plantilla de la DB. Si no existe o está desactivada,
 * registra el envío como "skipped" (sin lanzar).
 */
export async function sendTemplateEmail(params: {
  templateKey: string
  to: string
  clientId?: string | null
  vars: Record<string, unknown>
  attachments?: EmailAttachment[]
}): Promise<{ ok: boolean; status: string; logId?: string }> {
  const template = await prisma.emailTemplate.findUnique({
    where: { key: params.templateKey },
  })

  if (!template || !template.isActive) {
    await prisma.emailLog.create({
      data: {
        clientId: params.clientId || null,
        to: params.to,
        from: RESEND_FROM_EMAIL,
        subject: `(${params.templateKey})`,
        templateKey: params.templateKey,
        status: 'skipped',
        error: template ? 'Plantilla desactivada' : 'Plantilla inexistente',
      },
    })
    return { ok: false, status: 'skipped' }
  }

  const { subject, html } = renderTemplate(template, params.vars)
  return sendEmail({
    to: params.to,
    subject,
    html,
    templateKey: params.templateKey,
    clientId: params.clientId,
    attachments: params.attachments,
  })
}

/** Conveniencia para obtener los datos (nombre, proyecto, email) de un cliente. */
export async function getClientEmailContext(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      user: { select: { email: true } },
      basicData: { select: { projectName: true } },
    },
  })
  if (!client) return null
  return {
    clientId,
    name: client.name,
    email: client.user.email,
    projectName: client.basicData?.projectName || client.name,
  }
}
