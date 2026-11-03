import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { MAX_SPECIAL_TRACKS } from '@/lib/specials'

export const SPECIAL_INCLUDE = {
  tracks: {
    orderBy: { order: 'asc' },
    include: {
      track: {
        select: {
          id: true,
          title: true,
          artist: true,
          fileName: true,
          duration: true,
        },
      },
    },
  },
} satisfies Prisma.RadioSpecialInclude

export type SpecialWithTracks = Prisma.RadioSpecialGetPayload<{
  include: typeof SPECIAL_INCLUDE
}>

export function serializeSpecial(special: SpecialWithTracks, today?: string) {
  const tracks = special.tracks.map((entry) => ({
    id: entry.track.id,
    title: entry.track.title,
    artist: entry.track.artist,
    fileName: entry.track.fileName,
    duration: entry.track.duration,
    order: entry.order,
  }))
  const ready = tracks.length > 0 && Boolean(special.introReadyAt) && Boolean(special.closingReadyAt)
  const inWindow = !today || (
    (!special.startDate || special.startDate <= today) &&
    (!special.endDate || special.endDate >= today)
  )
  return {
    id: special.id,
    name: special.name,
    artist: special.artist || '',
    description: special.description,
    introText: special.introText,
    closingText: special.closingText,
    everyTracks: special.everyTracks,
    startDate: special.startDate || '',
    endDate: special.endDate || '',
    active: special.active,
    introReadyAt: special.introReadyAt,
    closingReadyAt: special.closingReadyAt,
    tracks,
    ready,
    status: !special.active
      ? 'inactive'
      : !inWindow
        ? 'outside_window'
        : tracks.length === 0
          ? 'no_tracks'
          : !special.introReadyAt || !special.closingReadyAt
            ? 'audio_missing'
            : 'ready',
    createdAt: special.createdAt,
    updatedAt: special.updatedAt,
  }
}

/** Valida que los tracks existan y pertenezcan al cliente. Devuelve null si hay error. */
export async function validateTrackIds(clientId: string, trackIds: string[]): Promise<string[] | null> {
  const unique = [...new Set(trackIds)]
  if (unique.length !== trackIds.length) return null
  if (unique.length > MAX_SPECIAL_TRACKS) return null
  if (unique.length === 0) return []
  const found = await prisma.track.findMany({
    where: { id: { in: unique }, clientId },
    select: { id: true },
  })
  if (found.length !== unique.length) return null
  return unique
}

export async function replaceSpecialTracks(specialId: string, trackIds: string[]) {
  await prisma.$transaction([
    prisma.radioSpecialTrack.deleteMany({ where: { specialId } }),
    ...(trackIds.length > 0
      ? [
          prisma.radioSpecialTrack.createMany({
            data: trackIds.map((trackId, order) => ({ specialId, trackId, order })),
          }),
        ]
      : []),
  ])
}
