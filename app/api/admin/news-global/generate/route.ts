import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { aiGenerateSchema } from '@/lib/validations'
import { generateNewsForCategory, type CurrentNewsContext } from '@/lib/deepseek'
import { fetchTopHeadlines, type NewsItem } from '@/lib/news-source'

const MAX_TOTAL_NEWS = 15

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY no está configurada en el servidor' },
        { status: 500 }
      )
    }

    if (!process.env.GNEWS_API_KEY) {
      return NextResponse.json(
        { error: 'GNEWS_API_KEY no está configurada en el servidor' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const data = aiGenerateSchema.parse(body)

    if (data.categoryIds.length * data.countPerCategory > MAX_TOTAL_NEWS) {
      return NextResponse.json(
        { error: `Has superado el límite de ${MAX_TOTAL_NEWS} noticias por generación` },
        { status: 400 }
      )
    }

    const headlines = await fetchTopHeadlines({ lang: 'es', max: 10 })
    if (!headlines || headlines.length === 0) {
      return NextResponse.json(
        {
          error:
            'No se pudo obtener el contexto de noticias actuales. GNews no está disponible o no devolvió titulares. No se creó ningún borrador.',
        },
        { status: 503 }
      )
    }

    const context: CurrentNewsContext = {
      fetchedAt: new Date().toISOString(),
      items: headlines.map((h) => ({
        title: h.title,
        source: h.source.name,
        publishedAt: h.publishedAt,
        description: h.description,
      })),
    }

    const categories = await prisma.globalNewsCategory.findMany({
      where: { id: { in: data.categoryIds } },
    })

    if (categories.length === 0) {
      return NextResponse.json({ error: 'No se encontraron categorías válidas' }, { status: 400 })
    }

    const runId = randomUUID()
    const imagePool = headlines.filter((h) => !!h.image)
    let imageCursor = 0

    const results: Array<{
      categoryId: string
      categoryName: string
      requested: number
      created: number
    }> = []

    for (const category of categories) {
      const drafts = await generateNewsForCategory(
        {
          name: category.name,
          slug: category.slug,
          description: category.description,
        },
        data.countPerCategory,
        context
      )

      if (drafts.length === 0) {
        results.push({
          categoryId: category.id,
          categoryName: category.name,
          requested: data.countPerCategory,
          created: 0,
        })
        continue
      }

      const usedSlugs = new Set<string>(
        (
          await prisma.globalNews.findMany({
            where: { slug: { in: drafts.map((d) => d.slug) } },
            select: { slug: true },
          })
        ).map((r) => r.slug)
      )

      let createdCount = 0
      for (const draft of drafts) {
        let finalSlug = draft.slug
        let suffix = 2
        while (usedSlugs.has(finalSlug)) {
          finalSlug = `${draft.slug}-${suffix}`
          suffix += 1
        }
        usedSlugs.add(finalSlug)

        const newsImage = pickImageForDraft(imagePool, imageCursor)
        imageCursor += 1

        try {
          await prisma.globalNews.create({
            data: {
              categoryId: category.id,
              name: draft.name,
              slug: finalSlug,
              shortText: draft.shortText,
              longText: draft.longText,
              imageUrl: newsImage?.url ?? null,
              imageSource: newsImage?.source ?? null,
              status: 'draft',
              source: 'ai',
              aiRunId: runId,
            },
          })
          createdCount += 1
        } catch (err) {
          console.error('[generate] error creando borrador:', err)
        }
      }

      results.push({
        categoryId: category.id,
        categoryName: category.name,
        requested: data.countPerCategory,
        created: createdCount,
      })
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0)

    return NextResponse.json({
      runId,
      totalCreated,
      byCategory: results,
      newsContext: {
        source: 'gnews',
        count: headlines.length,
        firstPublishedAt: headlines[0].publishedAt,
        lastPublishedAt: headlines[headlines.length - 1].publishedAt,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error generating global news:', error)
    return NextResponse.json({ error: 'Error interno al generar noticias' }, { status: 500 })
  }
}

function pickImageForDraft(
  pool: NewsItem[],
  cursor: number
): { url: string; source: string } | null {
  if (pool.length === 0) return null
  const item = pool[cursor % pool.length]
  return { url: item.image!, source: item.source.name }
}
