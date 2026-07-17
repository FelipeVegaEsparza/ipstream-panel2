import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener una plantilla específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { clients: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error al obtener plantilla:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar plantilla
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, displayName, description, imageUrl, isActive } = body

    // Verificar que la plantilla existe
    const existingTemplate = await prisma.template.findUnique({
      where: { id: params.id }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Si se cambia el nombre, verificar que no exista otro con ese nombre
    if (name && name !== existingTemplate.name) {
      const duplicateTemplate = await prisma.template.findUnique({
        where: { name }
      })

      if (duplicateTemplate) {
        return NextResponse.json({ error: 'Ya existe una plantilla con ese nombre' }, { status: 400 })
      }
    }

    const template = await prisma.template.update({
      where: { id: params.id },
      data: {
        name,
        displayName,
        description,
        imageUrl,
        isActive
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error al actualizar plantilla:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar plantilla
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la plantilla existe
    const template = await prisma.template.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { clients: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Verificar si hay clientes usando esta plantilla
    if (template._count.clients > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar. ${template._count.clients} cliente(s) están usando esta plantilla` 
      }, { status: 400 })
    }

    await prisma.template.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Plantilla eliminada exitosamente' })
  } catch (error) {
    console.error('Error al eliminar plantilla:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
