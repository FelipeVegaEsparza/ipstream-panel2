// =====================================================
// Email hooks — envíos automáticos ligados a pagos y soporte
// =====================================================
// Se ejecutan SIEMPRE después de que la operación de negocio commitea y
// NUNCA lanzan (un fallo de correo no revierte un pago ni un ticket).

import { prisma } from '@/lib/prisma'
import { sendTemplateEmail, getClientEmailContext } from './resend'
import { generateAccountPdf } from './account-pdf'
import { formatCurrency, formatDate } from './billing-format'

const panelUrl = () => process.env.NEXTAUTH_URL || 'https://panel.casterfly.com'

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
  planName?: string,
  notice?: string
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
        vence: payment ? formatDate(payment.dueDate, true) : '',
        aviso: notice || '',
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
 *
 * Cuando existe un pago pendiente, el correo avisa que el plan queda activo
 * por 24 horas y que debe pagarse antes de la fecha indicada para mantenerlo.
 */
export async function sendWelcomeEmail(
  clientId: string,
  planName?: string,
  payment?: { dueDate: Date; amount: number; currency: string } | null,
  siteUrl?: string | null
): Promise<{ ok: boolean; status: string; logId?: string }> {
  try {
    const ctx = await getClientEmailContext(clientId)
    if (!ctx?.email) return { ok: false, status: 'skipped' }

    const dueDate = payment?.dueDate ?? new Date()
    const dueLabel = formatDate(dueDate, true)

    return await sendTemplateEmail({
      templateKey: 'bienvenida',
      to: ctx.email,
      clientId,
      vars: {
        nombre: ctx.name,
        proyecto: ctx.projectName,
        plan: planName || '',
        monto: payment ? formatCurrency(payment.amount, payment.currency) : '',
        moneda: payment?.currency || '',
        fecha: dueLabel,
        prueba: payment
          ? `Tu plan estará activo por 24 horas. Realiza el pago antes del ${dueLabel} para mantener el servicio.`
          : '',
        link: `${panelUrl()}/dashboard/payments`,
        sitio: siteUrl || '',
      },
    })
  } catch (err) {
    console.error('[email-hooks] sendWelcomeEmail:', err)
    return { ok: false, status: 'failed' }
  }
}

/**
 * Confirma al cliente que recibimos su solicitud y que la cuenta queda
 * pendiente de activación. Se envía al terminar el registro público.
 */
export async function sendPendingSignupEmail(
  clientId: string
): Promise<{ ok: boolean; status: string; logId?: string }> {
  try {
    const ctx = await getClientEmailContext(clientId)
    if (!ctx?.email) return { ok: false, status: 'skipped' }

    return await sendTemplateEmail({
      templateKey: 'registro-pendiente',
      to: ctx.email,
      clientId,
      vars: {
        nombre: ctx.name,
        proyecto: ctx.projectName,
      },
    })
  } catch (err) {
    console.error('[email-hooks] sendPendingSignupEmail:', err)
    return { ok: false, status: 'failed' }
  }
}

/**
 * Avisa al cliente que su cuenta ya fue activada e incluye el enlace para
 * ingresar al panel con el email y la contraseña del registro.
 */
export async function sendAccountActivatedEmail(
  clientId: string
): Promise<{ ok: boolean; status: string; logId?: string }> {
  try {
    const ctx = await getClientEmailContext(clientId)
    if (!ctx?.email) return { ok: false, status: 'skipped' }

    return await sendTemplateEmail({
      templateKey: 'cuenta-activada',
      to: ctx.email,
      clientId,
      vars: {
        nombre: ctx.name,
        proyecto: ctx.projectName,
        link: `${panelUrl()}/auth/login`,
      },
    })
  } catch (err) {
    console.error('[email-hooks] sendAccountActivatedEmail:', err)
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
