// =====================================================
// Live Console — matemática de audio y utilidades puras
// =====================================================

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Curva equal-power: a la izquierda solo A, a la derecha solo B. */
export function equalPowerGains(position: number): { a: number; b: number } {
  const x = clamp(position, 0, 1)
  return {
    a: Math.cos((x * Math.PI) / 2),
    b: Math.sin((x * Math.PI) / 2),
  }
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20)
}

export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity
  return 20 * Math.log10(gain)
}

export function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

export function rmsToDb(rms: number): number {
  if (rms <= 0) return -Infinity
  return 20 * Math.log10(rms)
}

export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatDb(db: number): string {
  if (!Number.isFinite(db)) return '-∞ dB'
  return `${db.toFixed(1)} dB`
}

/** Deriva título/artista de un nombre de archivo tipo "Artista - Tema.mp3". */
export function parseTrackName(filename: string): { title: string; artist: string | null } {
  const base = filename.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim()
  const separators = [' - ', ' – ', ' — ', '_-_']
  for (const sep of separators) {
    const idx = base.indexOf(sep)
    if (idx > 0) {
      const artist = base.slice(0, idx).trim()
      const title = base.slice(idx + sep.length).trim()
      if (artist && title) return { artist, title }
    }
  }
  return { artist: null, title: base || filename }
}

/** Duración de un loop en segundos a partir de BPM y cantidad de beats. */
export function loopSecondsFromBpm(bpm: number, beats: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(beats) || beats <= 0) return 0
  return (60 / bpm) * beats
}

/** Cuantiza un tiempo al beat más cercano. */
export function quantizeToBeat(seconds: number, bpm: number | null): number {
  if (!bpm || !Number.isFinite(bpm) || bpm <= 0) return seconds
  const beat = 60 / bpm
  return Math.round(seconds / beat) * beat
}

export function isAudioFile(name: string, mimeType = ''): boolean {
  if (mimeType.startsWith('audio/')) return true
  return /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i.test(name)
}

export function mimeForName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp3': return 'audio/mpeg'
    case 'm4a': return 'audio/mp4'
    case 'aac': return 'audio/aac'
    case 'wav': return 'audio/wav'
    case 'ogg':
    case 'oga': return 'audio/ogg'
    case 'opus': return 'audio/opus'
    case 'flac': return 'audio/flac'
    case 'webm': return 'audio/webm'
    default: return 'application/octet-stream'
  }
}

/** Identificador estable para un archivo dentro de la biblioteca local. */
export function trackIdFor(path: string, size: number, lastModified: number): string {
  return `${path}::${size}::${lastModified}`
}
