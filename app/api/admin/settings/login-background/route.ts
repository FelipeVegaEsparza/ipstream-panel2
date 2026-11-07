import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']

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
    const session = await getSession()
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
 * Sube una imagen (optimizada a WebP) o un video MP4/WebM a public/uploads/login/.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
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

    const isImage = ALLOWED_IMAGE_TYPES.includes(fileBlob.type)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileBlob.type)

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa JPG, PNG, WebP, MP4 o WebM.' },
        { status: 400 }
      )
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (fileBlob.size > maxBytes) {
      return NextResponse.json(
        {
          error: isVideo
            ? 'El video supera el máximo de 50 MB.'
            : 'La imagen supera el máximo de 10 MB.',
        },
        { status: 400 }
      )
    }

    const bytes = await fileBlob.arrayBuffer()
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(bytes)
    let extension = 'webp'

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'login')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    if (isVideo) {
      extension = fileBlob.type === 'video/webm' ? 'webm' : 'mp4'
    } else {
      // Optimizar con sharp: redimensionar a 1920px max, convertir a WebP
      try {
        const image = sharp(buffer)
        const metadata = await image.metadata()
        if (metadata.width && metadata.width > 1920) {
          image.resize(1920, undefined, { fit: 'inside', withoutEnlargement: true })
        }
        buffer = await image.webp({ quality: 82 }).toBuffer()
        extension = 'webp'
      } catch (sharpError) {
        console.error('Error procesando imagen con sharp:', sharpError)
        extension =
          fileBlob.type === 'image/png'
            ? 'png'
            : fileBlob.type === 'image/webp'
              ? 'webp'
              : 'jpg'
      }
    }

    const timestamp = Date.now()
    const fileName = `login_${timestamp}.${extension}`
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    const publicUrl = `/api/uploads/login/${fileName}`

    const config = await saveLoginBackground(publicUrl)

    return NextResponse.json({
      message: isVideo ? 'Video subido y aplicado' : 'Imagen subida y aplicada',
      imageUrl: config.loginBackgroundImage,
      mediaType: isVideo ? 'video' : 'image',
    })
  } catch (error) {
    console.error('Error al subir el fondo del login:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
