import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'

const VALID_KEYS = new Set<string>(
  MENU_ITEMS.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) ?? [])])
)

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
    const items: Array<{ key: string; enabled: boolean }> = Array.isArray(body?.items) ? body.items : []

    for (const it of items) {
      if (typeof it.key !== 'string' || !VALID_KEYS.has(it.key)) {
        return NextResponse.json(
          { error: `Item inválido: ${it.key}` },
          { status: 400 }
        )
      }
      if (typeof it.enabled !== 'boolean') {
        return NextResponse.json(
          { error: `enabled inválido para ${it.key}` },
          { status: 400 }
        )
      }
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      // Borrar todas las filas existentes de este cliente
      await tx.clientMenuItem.deleteMany({
        where: { clientId: params.id },
      })

      // Crear filas solo para los items que el admin tocó
      // (los que están en default no necesitan fila, pero como ahora el admin
      // envía todos, creamos fila para todos los que se enviaron)
      if (items.length > 0) {
        await tx.clientMenuItem.createMany({
          data: items.map((it) => ({
            clientId: params.id,
            itemKey: it.key,
            enabled: it.enabled,
          })),
        })
      }
    })

    return NextResponse.json({
      message: 'Menú actualizado',
      items,
    })
  } catch (error) {
    console.error('Error al guardar menú:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const items = await prisma.clientMenuItem.findMany({
      where: { clientId: params.id },
      select: { itemKey: true, enabled: true },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error al obtener menú:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
