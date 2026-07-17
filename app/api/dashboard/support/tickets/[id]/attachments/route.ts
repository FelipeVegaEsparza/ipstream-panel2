import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { isAllowedMimeType, MAX_FILE_SIZE } from '@/lib/ticket-attachments'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effective = await getEffectiveClient()
    if (!effective) {
      return NextResponse.json({ error: 'Sin cliente asignado' }, { status: 401 })
    }

    // Verificar que el ticket pertenece al cliente
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: params.id, clientId: effective.clientId },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 })
    }

    const isFileLike =
      typeof file === 'object' &&
      file !== null &&
      typeof (file as { arrayBuffer?: unknown }).arrayBuffer === 'function' &&
      typeof (file as { size?: unknown }).size === 'number' &&
      typeof (file as { type?: unknown }).type === 'string'
    if (!isFileLike) {
      return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
    }
    const fileBlob = file as unknown as {
      name: string
      type: string
      size: number
      arrayBuffer: () => Promise<ArrayBuffer>
    }

    if (!isAllowedMimeType(fileBlob.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usa imágenes, PDFs o documentos.' },
        { status: 400 }
      )
    }

    if (fileBlob.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo supera el máximo de 10 MB.' },
        { status: 400 }
      )
    }

    const bytes = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const safeName = fileBlob.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const fileName = `${Date.now()}_${safeName}`
    const uploadDir = join(
      process.cwd(),
      'public',
      'uploads',
      'tickets',
      ticket.id
    )
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const publicUrl = `/api/uploads/tickets/${ticket.id}/${fileName}`

    const attachment = await prisma.supportTicketAttachment.create({
      data: {
        ticketId: ticket.id,
        messageId: null,
        fileName: fileBlob.name,
        fileUrl: publicUrl,
        fileSize: fileBlob.size,
        mimeType: fileBlob.type,
        uploadedBy: 'client',
        uploaderId: effective.clientId,
      },
    })

    return NextResponse.json({ attachment })
  } catch (error) {
    console.error('Error al subir adjunto:', error)
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
