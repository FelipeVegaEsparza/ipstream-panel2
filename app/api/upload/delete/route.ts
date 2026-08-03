import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user.clientId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')

    if (!fileName) {
      return NextResponse.json(
        { error: 'Nombre de archivo requerido' },
        { status: 400 }
      )
    }

    // Rechazar cualquier path traversal: solo se acepta un nombre de archivo simple
    if (fileName !== path.basename(fileName) || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json(
        { error: 'Nombre de archivo inválido' },
        { status: 400 }
      )
    }
    const safeFileName = path.basename(fileName)

    // Verificar que el archivo pertenece al cliente (carpeta por clientId)
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads', session.user.clientId)
    const filePath = path.resolve(uploadsDir, safeFileName)

    if (!filePath.startsWith(uploadsDir + path.sep)) {
      return NextResponse.json(
        { error: 'Nombre de archivo inválido' },
        { status: 400 }
      )
    }

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar archivo
    await unlink(filePath)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}