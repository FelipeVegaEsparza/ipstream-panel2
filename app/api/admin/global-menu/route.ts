import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MENU_ITEMS, type MenuItemKey } from '@/lib/menu-items'

const VALID_KEYS = new Set<string>(MENU_ITEMS.map((i) => i.key))
const LOCKED_KEYS = new Set<string>(
  MENU_ITEMS.filter((i) => i.alwaysEnabled).map((i) => i.key)
)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const config = await prisma.appConfig.findFirst()
    let items: string[] = []
    if (config?.hiddenMenuItems) {
      try {
        const parsed = JSON.parse(config.hiddenMenuItems)
        if (Array.isArray(parsed)) {
          items = parsed.filter((k): k is string => typeof k === 'string')
        }
      } catch {
        // JSON inválido: devolver array vacío
      }
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error al obtener menú global:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const items: unknown = body?.items
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items debe ser un array' }, { status: 400 })
    }

    const cleanItems: MenuItemKey[] = []
    const seen = new Set<string>()
    for (const raw of items) {
      if (typeof raw !== 'string' || !VALID_KEYS.has(raw)) {
        return NextResponse.json(
          { error: `Item inválido: ${String(raw)}` },
          { status: 400 }
        )
      }
      if (LOCKED_KEYS.has(raw)) {
        return NextResponse.json(
          { error: `El item "${raw}" no se puede ocultar (alwaysEnabled)` },
          { status: 400 }
        )
      }
      if (!seen.has(raw)) {
        seen.add(raw)
        cleanItems.push(raw as MenuItemKey)
      }
    }

    const data = JSON.stringify(cleanItems)
    const existing = await prisma.appConfig.findFirst()
    if (!existing) {
      await prisma.appConfig.create({ data: { hiddenMenuItems: data } })
    } else {
      await prisma.appConfig.update({
        where: { id: existing.id },
        data: { hiddenMenuItems: data },
      })
    }

    return NextResponse.json({ items: cleanItems })
  } catch (error) {
    console.error('Error al guardar menú global:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
