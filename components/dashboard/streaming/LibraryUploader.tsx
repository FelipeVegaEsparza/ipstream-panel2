'use client'

import { MediaUploader } from './MediaUploader'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Props {
  onUploaded: () => void
}

export function LibraryUploader({ onUploaded }: Props) {
  const { t } = useDashboardI18n()
  return (
    <MediaUploader
      accept=".mp3,audio/mpeg"
      endpoint="/api/dashboard/streaming/library"
      dropTitle={t('streaming.library.dropTitle')}
      hint={t('streaming.library.hint')}
      validateFile={(file) => file.name.toLowerCase().endsWith('.mp3')}
      invalidMessage={t('streaming.library.invalid')}
      onUploaded={onUploaded}
    />
  )
}
