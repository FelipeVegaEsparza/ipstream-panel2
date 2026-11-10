import { test } from 'node:test'
import assert from 'node:assert/strict'
process.env.STREAMING_AGENT_TOKEN = 'test-agent-token'
process.env.HARBOR_CALLBACK_SECRET = 'test-harbor-secret'
process.env.DB_USER = 'test'
process.env.DB_PASSWORD = 'test'
process.env.DB_DATABASE = 'test'
process.env.ICE_ADMIN_USER = 'admin'
process.env.ICE_ADMIN_PASSWORD = 'test'
process.env.ICE_SOURCE_PASSWORD = 'test'
process.env.ICE_RELAY_PASSWORD = 'test'
process.env.ICE_HOSTNAME = 'localhost'
process.env.HARBOR_PUBLIC_HOSTNAME = 'localhost'
process.env.LIVE_SESSION_SECRET = 'test-live-secret'
process.env.RADIO_SILENCE_FALLBACK_SECONDS = '10'
process.env.RADIO_SILENCE_THRESHOLD_DB = '-50'

const { generateLiquidsoapScript } = await import('../lib/script-generator.js')

function base(overrides = {}) {
  return {
    clientId: 'client1',
    clientName: 'Radio',
    icecastMount: '/radio',
    sourcePassword: 'secret',
    telnetPort: 1234,
    harborPassword: 'harbor',
    playlistM3uPath: '/tmp/playlist.m3u',
    mode: 'playlist',
    ...overrides,
  }
}

test('incluye la cola de noticias y espera el fin del track', () => {
  const script = generateLiquidsoapScript(base())
  assert.match(script, /news_queue = request\.queue\(id="news-queue"\)/)
  assert.match(script, /fallback\(track_sensitive=true, \[news_queue,/)
})

test('conserva jingles y no agrega la cola en modo single', () => {
  const withJingles = generateLiquidsoapScript(base({
    jinglePlayEvery: 5,
    jinglePlayCount: 1,
    jinglesM3uPath: '/tmp/jingles.m3u',
  }))
  assert.match(withJingles, /jinglePlayEvery|rotate/)
  assert.match(withJingles, /news_queue/)
  const single = generateLiquidsoapScript(base({ mode: 'single' }))
  assert.doesNotMatch(single, /news_queue/)
})
