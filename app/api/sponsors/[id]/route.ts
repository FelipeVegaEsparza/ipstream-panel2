import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sponsorSchema } from '@/lib/validations'
import { z } from 'zod'
import { invalidatePublicCache } from '@/lib/public-cache'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'sponsors')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getSession()
    if (!session?.user.clientId) {
      invalidatePublicCache()
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = sponsorSchema.parse(body)

    const updated = await prisma.sponsor.update({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      },
      data: data as Prisma.SponsorUpdateInput,
    })

    invalidatePublicCache()
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating sponsor:', error)
    if (error instanceof z.ZodError) {
      invalidatePublicCache()
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    invalidatePublicCache()
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'sponsors')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getSession()
    
    if (!session?.user.clientId) {
      invalidatePublicCache()
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    await prisma.sponsor.delete({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      }
    })

    invalidatePublicCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sponsor:', error)
    invalidatePublicCache()
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'sponsors')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getSession()
    
    if (!session?.user.clientId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const sponsor = await prisma.sponsor.findFirst({
      where: {
        id: params.id,
        clientId: session.user.clientId,
      }
    })

    if (!sponsor) {
      return NextResponse.json(
        { error: 'Auspiciador no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(sponsor)
  } catch (error) {
    console.error('Error fetching sponsor:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
