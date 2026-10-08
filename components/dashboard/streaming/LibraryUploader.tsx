'use client'

import { MediaUploader } from './MediaUploader'

interface Props {
  onUploaded: () => void
}

export function LibraryUploader({ onUploaded }: Props) {
  return (
    <MediaUploader
      accept=".mp3,audio/mpeg"
      endpoint="/api/dashboard/streaming/library"
      dropTitle="Arrastra MP3s aquí o haz clic para seleccionar"
      hint="Máximo 50MB por archivo. Solo .mp3"
      validateFile={(file) => file.name.toLowerCase().endsWith('.mp3')}
      invalidMessage="Solo se aceptan .mp3"
      onUploaded={onUploaded}
    />
  )
}
