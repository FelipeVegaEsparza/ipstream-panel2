import { prisma } from '@/lib/prisma'
import { getClientStreamUrls } from '@/lib/streaming-helpers'

export type ClientServices = 'radio' | 'tv' | 'both'

export interface PublicBasicData {
  projectName: string | null
  projectDescription: string | null
  logoUrl: string | null
  coverUrl: string | null
  radioStreamingUrl: string | null
  videoStreamingUrl: string | null
  createdAt: Date | null
  updatedAt: Date | null
  services: ClientServices
}

/**
 * Serialización ÚNICA del bloque basicData público de un cliente.
 * Las URLs de streaming SIEMPRE se derivan del plan + streams existentes
 * (getClientStreamUrls) y NUNCA se leen de la fila persistida de BasicData,
 * para que `/basic-data` y el payload completo `/api/public/{clientId}`
 * jamás devuelvan valores distintos para el mismo campo.
 * Devuelve null si el cliente no existe o no tiene fila de BasicData.
 */
export async function getPublicBasicData(clientId: string): Promise<PublicBasicData | null> {
  const [client, basicData] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { plan: { select: { services: true } } },
    }),
    prisma.basicData.findUnique({
      where: { clientId },
      select: {
        projectName: true,
        projectDescription: true,
        logoUrl: true,
        coverUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  if (!client || !basicData) return null

  const { radioStreamingUrl, videoStreamingUrl } = await getClientStreamUrls(clientId)
  const services: ClientServices = client.plan?.services === 'radio' || client.plan?.services === 'tv'
    ? client.plan.services
    : 'both'

  return { ...basicData, radioStreamingUrl, videoStreamingUrl, services }
}
