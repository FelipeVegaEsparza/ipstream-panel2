// =====================================================
// Live Console — worker de escaneo de biblioteca
// =====================================================
// Enumera una carpeta autorizada y devuelve tracks con su FileSystemFileHandle.
// La duración se calcula luego en el hilo principal (requiere decodificar).

import { isAudioFile, isCoverFile, mimeForName, parseTrackName, trackIdFor } from './audio-math'

interface ScanRequest {
  type: 'scan'
  handle: FileSystemDirectoryHandle
}

interface WorkerTrack {
  id: string
  name: string
  path: string
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  size: number
  lastModified: number
  mimeType: string
  source: 'handle'
  handle: FileSystemFileHandle
  coverHandle: FileSystemFileHandle | null
  file: null
  available: boolean
}

const ctx = self as unknown as Worker

ctx.onmessage = async (event: MessageEvent<ScanRequest>) => {
  if (event.data?.type !== 'scan') return
  let scanned = 0
  let added = 0

  try {
    async function walk(
      dir: FileSystemDirectoryHandle,
      prefix: string,
      inheritedCover: FileSystemFileHandle | null
    ): Promise<void> {
      const entries: Array<[string, FileSystemHandle]> = []
      for await (const entry of (dir as unknown as {
        entries: () => AsyncIterable<[string, FileSystemHandle]>
      }).entries()) {
        entries.push(entry)
      }
      const ownCover = entries.find(
        ([name, entry]) => entry.kind === 'file' && isCoverFile(name)
      )?.[1] as FileSystemFileHandle | undefined
      const coverHandle = ownCover ?? inheritedCover

      for (const [name, entry] of entries) {
        if (entry.kind === 'directory') {
          await walk(entry as FileSystemDirectoryHandle, `${prefix}${name}/`, coverHandle)
          continue
        }
        if (!isAudioFile(name)) continue

        const fileHandle = entry as FileSystemFileHandle
        scanned++

        try {
          const file = await fileHandle.getFile()
          const parsed = parseTrackName(name)
          const track: WorkerTrack = {
            id: trackIdFor(`${prefix}${name}`, file.size, file.lastModified),
            name,
            path: `${prefix}${name}`,
            title: parsed.title,
            artist: parsed.artist,
            album: null,
            duration: null,
            size: file.size,
            lastModified: file.lastModified,
            mimeType: file.type || mimeForName(name),
            source: 'handle',
            handle: fileHandle,
            coverHandle,
            file: null,
            available: true,
          }
          added++
          ctx.postMessage({ type: 'track', track })
        } catch {
          // Archivo ilegible: se omite sin abortar el escaneo.
        }

        if (scanned % 10 === 0) {
          ctx.postMessage({ type: 'progress', scanned, added })
        }
      }
    }

    await walk(event.data.handle, '', null)
    ctx.postMessage({ type: 'done', scanned, added })
  } catch (error) {
    ctx.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Error escaneando la carpeta',
    })
  }
}
