import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener todas las plantillas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { clients: true }
        }
      }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error al obtener plantillas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nueva plantilla
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, displayName, description, imageUrl, isActive } = body

    if (!name || !displayName) {
      return NextResponse.json({ error: 'Nombre y nombre para mostrar son requeridos' }, { status: 400 })
    }

    // Verificar que el nombre no exista
    const existingTemplate = await prisma.template.findUnique({
      where: { name }
    })

    if (existingTemplate) {
      return NextResponse.json({ error: 'Ya existe una plantilla con ese nombre' }, { status: 400 })
    }

    const template = await prisma.template.create({
      data: {
        name,
        displayName,
        description,
        imageUrl,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error al crear plantilla:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
