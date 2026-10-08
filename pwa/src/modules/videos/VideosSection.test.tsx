import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FullClientData, Video } from '@/core/types'
import { VideosSection } from './VideosSection'

function clientDataWith(videos: FullClientData['videos']): FullClientData {
  return { videos } as unknown as FullClientData
}

function videoItem(id: string, name: string, videoUrl: string): Video {
  return {
    id,
    name,
    videoUrl,
    description: '',
    order: 1,
    createdAt: '',
    updatedAt: ''
  }
}

describe('VideosSection', () => {
  it('no se renderiza sin videos', () => {
    render(<VideosSection clientData={clientDataWith([])} isLoading={false} />)
    expect(screen.queryByText('Videos')).toBeNull()
  })

  it('abre un modal de reproducción al hacer clic en un video de YouTube', () => {
    render(
      <VideosSection
        clientData={clientDataWith([videoItem('v1', 'Entrevista a banda', 'https://www.youtube.com/watch?v=abcdef12345')])}
        isLoading={false}
      />
    )

    expect(screen.getByText('Videos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Reproducir Entrevista/ }))

    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/abcdef12345'
    )
  })

  it('reproduce YouTube aunque el parámetro v no sea el primero de la query', () => {
    render(
      <VideosSection
        clientData={clientDataWith([
          videoItem('v2', 'Con parámetros previos', 'https://www.youtube.com/watch?feature=share&v=abcdef12345')
        ])}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Reproducir Con parámetros/ }))

    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/abcdef12345'
    )
  })

  it('reproduce Vimeo en un iframe y no usa la miniatura de YouTube', () => {
    render(
      <VideosSection
        clientData={clientDataWith([videoItem('v3', 'Clip Vimeo', 'https://vimeo.com/76979871')])}
        isLoading={false}
      />
    )

    const button = screen.getByRole('button', { name: /Reproducir Clip Vimeo/ })
    expect(within(button).getByText('▶')).toBeInTheDocument()
    expect(button.querySelector('img')).toBeNull()

    fireEvent.click(button)

    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe(
      'https://player.vimeo.com/video/76979871'
    )
  })

  it('usa el reproductor nativo para un archivo multimedia directo', () => {
    render(
      <VideosSection
        clientData={clientDataWith([
          videoItem('v4', 'Clip directo', 'https://cdn.example.com/clips/entrevista.mp4')
        ])}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Reproducir Clip directo/ }))

    expect(document.querySelector('iframe')).toBeNull()
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('src')).toBe(
      'https://cdn.example.com/clips/entrevista.mp4'
    )
  })

  it('enruta una URL .m3u8 al reproductor HLS', () => {
    render(
      <VideosSection
        clientData={clientDataWith([
          videoItem('v6', 'Señal HLS', 'https://cdn.example.com/live/stream.m3u8')
        ])}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Reproducir Señal HLS/ }))

    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.getAttribute('data-hls')).toBe('true')
    expect(screen.queryByText('Contenido no disponible para reproducción')).toBeNull()
  })

  it('muestra aviso y enlace externo si la URL no se puede reproducir', () => {
    render(
      <VideosSection
        clientData={clientDataWith([
          videoItem('v5', 'Sin embed', 'https://example.com/entrevistas/video')
        ])}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Reproducir Sin embed/ }))

    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('video')).toBeNull()
    expect(
      screen.getByText('Contenido no disponible para reproducción')
    ).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'Abrir en YouTube/Vimeo' })
    expect(link).toHaveAttribute('href', 'https://example.com/entrevistas/video')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('cierra el modal si el video activo desaparece tras refrescar los datos', () => {
    const item = videoItem(
      'v1',
      'Video efímero',
      'https://www.youtube.com/watch?v=abcdef12345'
    )
    const { rerender } = render(
      <VideosSection clientData={clientDataWith([item])} isLoading={false} />
    )

    fireEvent.click(screen.getByRole('button', { name: /Reproducir Video efímero/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    rerender(<VideosSection clientData={clientDataWith([])} isLoading={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
