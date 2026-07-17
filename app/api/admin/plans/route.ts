import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obtener todos los planes
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            clients: true,
            subscriptions: true
          }
        }
      }
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error al obtener planes:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo plan
export async function POST(request: NextRequest) {
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

    // Verificar que el nombre no esté duplicado
    const existingPlan = await prisma.plan.findUnique({
      where: { name }
    })

    if (existingPlan) {
      return NextResponse.json({ error: 'Ya existe un plan con ese nombre' }, { status: 400 })
    }

    const plan = await prisma.plan.create({
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

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Error al crear plan:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}