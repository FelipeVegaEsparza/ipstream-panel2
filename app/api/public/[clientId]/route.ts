import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

async function getNewsForClient(client: {
  id: string
  useGenericNews: boolean
  genericCategories: { id: string }[]
}) {
  const config = await prisma.appConfig.findFirst()

  if (config?.enableGenericNews && client.useGenericNews) {
    const categoryIds = client.genericCategories.map(c => c.id)
    return prisma.globalNews.findMany({
      where: { categoryId: { in: categoryIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        shortText: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  }

  return prisma.news.findMany({
    where: { clientId: client.id },
    select: {
      id: true,
      name: true,
      slug: true,
      shortText: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { 
        id: true, 
        name: true,
        templateId: true,
        oneSignalAppId: true,
        useGenericNews: true,
        genericCategories: {
          select: { id: true }
        }
      }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    // Obtener la plantilla seleccionada si existe
    let selectedTemplate = null
    if (client.templateId) {
      const template = await prisma.template.findUnique({
        where: { id: client.templateId },
        select: {
          name: true,
          displayName: true
        }
      })
      selectedTemplate = template ? template.name : null
    }

    // Obtener todos los datos del cliente
    const [socialNetworks, programs, news, videos, sponsors, promotions, galleries, announcers, polls, events, [podcasts, videocasts]] = await Promise.all([
      prisma.socialNetworks.findUnique({
        where: { clientId },
        select: {
          facebook: true,
          youtube: true,
          instagram: true,
          tiktok: true,
          whatsapp: true,
          x: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.program.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          description: true,
          startTime: true,
          endTime: true,
          weekDays: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { startTime: 'asc' }
      }),
      getNewsForClient(client),
      prisma.rankingVideo.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          videoUrl: true,
          description: true,
          order: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { order: 'asc' }
      }),
      prisma.sponsor.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          address: true,
          description: true,
          facebook: true,
          youtube: true,
          instagram: true,
          tiktok: true,
          whatsapp: true,
          x: true,
          website: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.promotion.findMany({
        where: { clientId },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          link: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.gallery.findMany({
        where: { clientId },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          images: {
            select: {
              id: true,
              imageUrl: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.announcer.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.poll.findMany({
        where: { clientId, active: true },
        select: {
          id: true,
          title: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          options: {
            select: { id: true, text: true, votes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.findMany({
        where: { clientId },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          time: true,
          location: true,
          eventUrl: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ date: 'desc' }, { time: 'asc' }],
      }),
      Promise.all([
        // Podcasts (audio)
        prisma.podcast.findMany({
          where: { 
            clientId,
            fileType: 'audio'
          },
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            audioUrl: true,
            duration: true,
            episodeNumber: true,
            season: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: [
            { episodeNumber: 'desc' },
            { createdAt: 'desc' }
          ],
          take: 10
        }),
        // Videocasts (video)
        prisma.podcast.findMany({
          where: { 
            clientId,
            fileType: 'video'
          },
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            videoUrl: true,
            duration: true,
            episodeNumber: true,
            season: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: [
            { episodeNumber: 'desc' },
            { createdAt: 'desc' }
          ],
          take: 10
        })
      ])
    ])

    // Procesar weekDays para programs
    const processedPrograms = programs.map(program => ({
      ...program,
      weekDays: typeof program.weekDays === 'string' ? JSON.parse(program.weekDays) : program.weekDays
    }))

    // basicData con la misma serialización que /basic-data (URLs derivadas
    // del plan + streams, nunca de la fila persistida).
    const { getPublicBasicData } = await import('@/lib/public-basic-data')
    const basicData = await getPublicBasicData(clientId)

    return createCorsResponse({
      client: {
        id: client.id,
        name: client.name
      },
      selectedTemplate,
      oneSignalAppId: client.oneSignalAppId || null,
      basicData,
      socialNetworks,
      programs: processedPrograms,
      news,
      videos,
      sponsors,
      promotions,
      galleries,
      announcers,
      polls,
      events,
      podcasts,
      videocasts
    })

  } catch (error) {
    console.error('Error getting client data:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
