import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const result = await prisma.globalNews.deleteMany({
      where: {
        aiRunId: params.runId,
        status: 'draft',
      },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Error discarding run:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
