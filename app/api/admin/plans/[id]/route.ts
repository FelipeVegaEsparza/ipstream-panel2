import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener plan específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            clients: true,
            subscriptions: true
          }
        }
      }
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error al obtener plan:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar plan
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
    const { name, description, price, currency, interval, features, isActive } = body

    // Validaciones
    if (!name || !description || price === undefined || !interval) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (price < 0) {
      return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 })
    }

    if (!['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json({ error: 'Intervalo inválido' }, { status: 400 })
    }

    // Verificar que el plan existe
    const existingPlan = await prisma.plan.findUnique({
      where: { id: params.id }
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    // Verificar que el nombre no esté duplicado (excepto el actual)
    if (name !== existingPlan.name) {
      const duplicatePlan = await prisma.plan.findUnique({
        where: { name }
      })

      if (duplicatePlan) {
        return NextResponse.json({ error: 'Ya existe un plan con ese nombre' }, { status: 400 })
      }
    }

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        name,
        description,
        price,
        currency: currency || 'CLP',
        interval,
        features: features || '[]',
        isActive: isActive ?? true
      }
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error al actualizar plan:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el plan existe
    const existingPlan = await prisma.plan.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            clients: true,
            subscriptions: true
          }
        }
      }
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    // Verificar que no tenga clientes o suscripciones activas
    if (existingPlan._count.clients > 0 || existingPlan._count.subscriptions > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar un plan que tiene clientes o suscripciones asociadas' 
      }, { status: 400 })
    }

    await prisma.plan.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Plan eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar plan:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}