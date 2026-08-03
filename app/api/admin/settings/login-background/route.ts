import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

async function saveLoginBackground(imageUrl: string | null) {
  const existing = await prisma.appConfig.findFirst()
  if (existing) {
    return prisma.appConfig.update({
      where: { id: existing.id },
      data: { loginBackgroundImage: imageUrl },
    })
  }
  return prisma.appConfig.create({ data: { loginBackgroundImage: imageUrl } })
}

/**
 * Acepta JSON: { imageUrl: string | null } — para pegar una URL externa.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const schema = z.object({
      imageUrl: z
        .string()
        .url()
        .max(500)
        .nullable()
        .or(z.literal('').transform(() => null)),
    })
    const { imageUrl } = schema.parse(body)

    const config = await saveLoginBackground(imageUrl)

    return NextResponse.json({
      message: 'Fondo del login actualizado',
      imageUrl: config.loginBackgroundImage,
    })
  } catch (error) {
    console.error('Error al guardar fondo del login:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Acepta multipart/form-data con un campo "file".
 * Sube la imagen a public/uploads/login/ y guarda la URL pública.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 })
    }

    // Validar que sea un archivo (sin depender del global File)
    const isFileLike =
      typeof file === 'object' &&
      file !== null &&
      typeof (file as { arrayBuffer?: unknown }).arrayBuffer === 'function' &&
      typeof (file as { size?: unknown }).size === 'number' &&
      typeof (file as { type?: unknown }).type === 'string'
    if (!isFileLike) {
      return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
    }
    const fileBlob = file as unknown as File

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa JPG, PNG o WebP.' },
        { status: 400 }
      )
    }

    if (fileBlob.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'La imagen supera el máximo de 10 MB.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(fileBlob.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa JPG, PNG o WebP.' },
        { status: 400 }
      )
    }

    const bytes = await fileBlob.arrayBuffer()
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'login')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Optimizar con sharp: redimensionar a 1920px max, convertir a WebP
    try {
      const image = sharp(buffer)
      const metadata = await image.metadata()
      if (metadata.width && metadata.width > 1920) {
        image.resize(1920, undefined, { fit: 'inside', withoutEnlargement: true })
      }
      buffer = await image.webp({ quality: 82 }).toBuffer()
    } catch (sharpError) {
      console.error('Error procesando imagen con sharp:', sharpError)
    }

    const timestamp = Date.now()
    const fileName = `login_${timestamp}.webp`
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const publicUrl = `/api/uploads/login/${fileName}`

    const config = await saveLoginBackground(publicUrl)

    return NextResponse.json({
      message: 'Imagen subida y aplicada',
      imageUrl: config.loginBackgroundImage,
    })
  } catch (error) {
    console.error('Error al subir imagen del login:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
