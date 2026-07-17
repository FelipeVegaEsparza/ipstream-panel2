import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const paymentId = params.id

    // Verificar que el pago existe
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { client: true }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('receipt') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WebP) y PDF' 
      }, { status: 400 })
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'El archivo es demasiado grande. Máximo 10MB' 
      }, { status: 400 })
    }

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'receipts', payment.clientId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `receipt_${paymentId}_${timestamp}.${extension}`
    const filepath = join(uploadDir, filename)

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Actualizar URL del comprobante en la base de datos
    const receiptUrl = `/api/uploads/receipts/${payment.clientId}/${filename}`
    
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { receiptUrl }
    })

    return NextResponse.json({
      message: 'Comprobante subido exitosamente',
      receiptUrl,
      payment: updatedPayment
    })

  } catch (error) {
    console.error('Error al subir comprobante:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
