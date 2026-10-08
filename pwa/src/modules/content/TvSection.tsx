import { Section } from '@/ui'
import { getTvStreamUrl } from '@/core/service'
import type { SectionDataProps } from './format'
import { TvPlayer } from '@/modules/tv/TvPlayer'

export function TvSection({ clientData }: SectionDataProps) {
  const videoUrl = getTvStreamUrl(clientData?.basicData)

  return (
    <Section title="TV en vivo" visible={Boolean(videoUrl)}>
      {videoUrl && <TvPlayer src={videoUrl} />}
    </Section>
  )
}
