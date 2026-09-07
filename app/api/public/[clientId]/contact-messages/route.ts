import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { contactMessageSchema } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/text-sanitizer'

export async function OPTIONS() {
  return handleCors()
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    // Rate limit por IP: 5 mensajes / 10 minutos
    const rl = rateLimit({
      maxRequests: 5,
      windowMs: 10 * 60 * 1000,
      identifier: `contact-message:${ip}`,
    })

    if (!rl.allowed) {
      return createCorsErrorResponse('Demasiados mensajes. Inténtalo más tarde', 429)
    }

    const body = await request.json().catch(() => null)
    const parsed = contactMessageSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Datos inválidos'
      return createCorsErrorResponse(firstError, 400)
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const created = await prisma.contactMessage.create({
      data: {
        clientId,
        name: sanitizeText(parsed.data.name).slice(0, 120),
        email: parsed.data.email,
        phone: sanitizeText(parsed.data.phone).slice(0, 40),
        message: sanitizeText(parsed.data.message).slice(0, 2000),
        status: 'new',
        ip: ip === 'unknown' ? null : ip,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    })

    return createCorsResponse(
      {
        id: created.id,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
      201
    )
  } catch (error) {
    console.error('Error creating contact message:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
