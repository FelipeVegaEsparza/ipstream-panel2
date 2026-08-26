import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({
        data: { enableGenericNews: false }
      })
    }

    return NextResponse.json({ enableGenericNews: config.enableGenericNews, adminNotifyEmail: config.adminNotifyEmail })
  } catch (error) {
    console.error('Error getting app config:', error)
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
    const { enableGenericNews, adminNotifyEmail } = body

    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({
        data: {
          enableGenericNews: enableGenericNews ?? false,
          adminNotifyEmail: adminNotifyEmail ?? null,
        },
      })
    } else {
      config = await prisma.appConfig.update({
        where: { id: config.id },
        data: {
          ...(enableGenericNews !== undefined ? { enableGenericNews } : {}),
          ...(adminNotifyEmail !== undefined ? { adminNotifyEmail: adminNotifyEmail || null } : {}),
        },
      })
    }

    return NextResponse.json({ enableGenericNews: config.enableGenericNews, adminNotifyEmail: config.adminNotifyEmail })
  } catch (error) {
    console.error('Error updating app config:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
