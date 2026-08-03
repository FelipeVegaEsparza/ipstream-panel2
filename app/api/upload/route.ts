import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Permitir tanto a clientes como a administradores
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Determinar el directorio de subida
    let uploadClientId: string
    
    if (session.user.role === 'ADMIN') {
      // Para admin, usar un directorio especial o el clientId si existe
      uploadClientId = session.user.clientId || 'admin'
    } else {
      // Para clientes, usar su clientId
      if (!session.user.clientId) {
        return NextResponse.json(
          { error: 'No autorizado - Cliente sin ID' },
          { status: 401 }
        )
      }
      uploadClientId = session.user.clientId
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json(
        { error: 'No se encontró archivo' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg']
    const videoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime']
    
    const allowedTypes = [...imageTypes, ...audioTypes, ...videoTypes]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Se permiten imágenes (JPG, PNG, GIF, WebP), audio (MP3, WAV, M4A, AAC) y video (MP4, MOV, AVI, WebM)' },
        { status: 400 }
      )
    }

    // Validar tamaño según tipo de archivo
    let maxSize = 5 * 1024 * 1024 // 5MB para imágenes por defecto
    
    if (audioTypes.includes(file.type)) {
      maxSize = 100 * 1024 * 1024 // 100MB para audio
    } else if (videoTypes.includes(file.type)) {
      maxSize = 500 * 1024 * 1024 // 500MB para video
    }
    
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      return NextResponse.json(
        { error: `El archivo es demasiado grande. Máximo ${maxSizeMB}MB para este tipo de archivo` },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(bytes)

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), 'public', 'uploads', uploadClientId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    let fileName = `${timestamp}_${originalName}`

    // Redimensionar imágenes con Sharp para optimización web
    if (imageTypes.includes(file.type)) {
      try {
        const image = sharp(buffer)
        const metadata = await image.metadata()
        
        // Redimensionar si el ancho supera 1920px (manteniendo aspect ratio)
        if (metadata.width && metadata.width > 1920) {
          image.resize(1920, undefined, { fit: 'inside', withoutEnlargement: true })
        }
        
        // Convertir a WebP si es JPEG/PNG para mejor compresión
        if (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png') {
          buffer = await image.webp({ quality: 82 }).toBuffer()
          fileName = `${timestamp}_${originalName.replace(/\.[^.]+$/, '')}.webp`
        } else {
          buffer = await image.jpeg({ quality: 82 }).toBuffer()
        }
      } catch (sharpError) {
        console.error('Error processing image with Sharp:', sharpError)
        // Si falla Sharp, guardar la imagen original
      }
    }

    const filePath = join(uploadDir, fileName)

    // Guardar archivo
    await writeFile(filePath, buffer)

    const finalSize = buffer.length
    const finalType = fileName.endsWith('.webp') ? 'image/webp' : file.type

    // Retornar URL pública que apunta a nuestra API
    const publicUrl = `/api/uploads/${uploadClientId}/${fileName}`

    return NextResponse.json({
      url: publicUrl,
      fileName: fileName,
      originalName: file.name,
      size: finalSize,
      type: finalType
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}