// =====================================================
// Email hooks — envíos automáticos ligados a pagos y soporte
// =====================================================
// Se ejecutan SIEMPRE después de que la operación de negocio commitea y
// NUNCA lanzan (un fallo de correo no revierte un pago ni un ticket).

import { prisma } from '@/lib/prisma'
import { sendTemplateEmail, getClientEmailContext } from './resend'
import { generateAccountPdf } from './account-pdf'
import { formatCurrency, formatDate } from './billing-format'

const panelUrl = () => process.env.NEXTAUTH_URL || 'https://panelipstream.cl'

export interface PaymentEmailInfo {
  amount: number
  currency: string
  dueDate: Date
  description?: string | null
}

/**
 * Envía la boleta/cuenta del mes (template `boleta`) con el PDF adjunto.
 * Se usa al confirmar un pago y al generarse una cuota pendiente.
 */
export async function sendAccountEmail(
  clientId: string,
  payment: PaymentEmailInfo | null,
  planName?: string
): Promise<{ ok: boolean; status: string; logId?: string }> {
  try {
    const ctx = await getClientEmailContext(clientId)
    if (!ctx?.email) return { ok: false, status: 'skipped' }

    const pdf = await generateAccountPdf(clientId)

    return await sendTemplateEmail({
      templateKey: 'boleta',
      to: ctx.email,
      clientId,
      vars: {
        nombre: ctx.name,
        proyecto: ctx.projectName,
        plan: planName || '',
        monto: payment ? formatCurrency(payment.amount, payment.currency) : '',
        moneda: payment?.currency || 'CLP',
        fecha: payment ? formatDate(payment.dueDate) : '',
        descripcion: payment?.description || '',
        vence: payment ? formatDate(payment.dueDate) : '',
        link: `${panelUrl()}/dashboard/payments`,
      },
      attachments: [{ filename: pdf.fileName, content: pdf.base64, contentType: 'application/pdf' }],
    })
  } catch (err) {
    console.error('[email-hooks] sendAccountEmail:', err)
    return { ok: false, status: 'failed' }
  }
}

/**
 * Envía el correo de bienvenida (template `bienvenida`) cuando un cliente
 * contrata un plan. Se usa al registrarse/suscribirse y al asignarle un plan
 * desde el admin, además de la boleta/cobro.
 */
export async function sendWelcomeEmail(
  clientId: string,
  planName?: string
): Promise<{ ok: boolean; status: string; logId?: string }> {
  try {
    const ctx = await getClientEmailContext(clientId)
    if (!ctx?.email) return { ok: false, status: 'skipped' }

    return await sendTemplateEmail({
      templateKey: 'bienvenida',
      to: ctx.email,
      clientId,
      vars: {
        nombre: ctx.name,
        proyecto: ctx.projectName,
        plan: planName || '',
        monto: '',
        moneda: '',
        fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
        link: `${panelUrl()}/dashboard`,
      },
    })
  } catch (err) {
    console.error('[email-hooks] sendWelcomeEmail:', err)
    return { ok: false, status: 'failed' }
  }
}

/**
 * Envía la notificación de soporte (template `soporte`) cuando el admin
 * responde un ticket. Incluye la respuesta y un enlace al ticket.
 */
export async function sendSupportReplyEmail(
  ticketId: string,
  replyBody: string
): Promise<{ ok: boolean; status: string; logId?: string }> {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            user: { select: { email: true } },
            basicData: { select: { projectName: true } },
          },
        },
      },
    })
    const email = ticket?.client?.user.email
    if (!ticket || !email) return { ok: false, status: 'skipped' }

    const c = ticket.client
    return await sendTemplateEmail({
      templateKey: 'soporte',
      to: email,
      clientId: c.id,
      vars: {
        nombre: c.name,
        proyecto: c.basicData?.projectName || c.name,
        asunto: ticket.subject,
        respuesta: replyBody,
        link: `${panelUrl()}/dashboard/support/${ticket.id}`,
      },
    })
  } catch (err) {
    console.error('[email-hooks] sendSupportReplyEmail:', err)
    return { ok: false, status: 'failed' }
  }
}
