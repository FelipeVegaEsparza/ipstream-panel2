// Divide la locución del jingle en frases para editarlas por separado.
// Mantiene el texto original (sin perder caracteres) y limita la cantidad
// de llamadas de TTS.

const MAX_CHUNKS = 3
const MIN_CHUNK_LENGTH = 12

export function splitJingleScript(text: string, maxChunks = MAX_CHUNKS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const sentences = clean
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (sentences.length <= 1) return [clean]

  const merged: string[] = []
  for (const sentence of sentences) {
    const last = merged[merged.length - 1]
    if (last && (last.length < MIN_CHUNK_LENGTH || sentence.length < MIN_CHUNK_LENGTH)) {
      merged[merged.length - 1] = `${last} ${sentence}`.replace(/\s+/g, ' ').trim()
    } else {
      merged.push(sentence)
    }
  }

  while (merged.length > maxChunks) {
    const tail = merged.pop()!
    merged[merged.length - 1] = `${merged[merged.length - 1]} ${tail}`.replace(/\s+/g, ' ').trim()
  }

  return merged.length > 0 ? merged : [clean]
}
