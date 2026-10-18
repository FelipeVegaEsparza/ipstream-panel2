// =====================================================
// Live Console — worker de BPM
// =====================================================

import { detectBpm } from './bpm'

interface BpmRequest {
  id: number
  mono: Float32Array
  sampleRate: number
}

self.onmessage = (event: MessageEvent<BpmRequest>) => {
  const { id, mono, sampleRate } = event.data
  try {
    const result = detectBpm(mono, sampleRate)
    ;(self as unknown as Worker).postMessage({ id, result })
  } catch {
    ;(self as unknown as Worker).postMessage({ id, result: null })
  }
}
