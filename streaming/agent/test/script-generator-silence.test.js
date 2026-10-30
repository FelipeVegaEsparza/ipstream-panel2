import test from 'node:test'
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

function baseArgs(overrides = {}) {
  return {
    clientId: 'client-1',
    clientName: 'Cliente',
    icecastMount: 'radio_test',
    sourcePassword: 'source',
    telnetPort: 12340,
    harborPassword: 'live',
    bitrate: 192,
    playlistM3uPath: '/tmp/playlist.m3u',
    ...overrides,
  }
}

test('el script legacy envuelve el harbor con blank.detect y callback de silencio', () => {
  const script = generateLiquidsoapScript(baseArgs())
  assert.match(script, /live = blank\.detect\(max_blank=10\.0, threshold=-50\.0, live\)/)
  assert.match(script, /live\.on_blank\(synchronous=false, fun \(\) ->/)
  assert.match(script, /\/harbor\/silence\?dj=%2Flive&slot=live/)
  assert.match(script, /fallback\(track_sensitive=false, \[live, autodj\]\)/)
})

test('el script multi-DJ envuelve cada slot', () => {
  const script = generateLiquidsoapScript(baseArgs({
    djs: [
      { mount: '/dj1', password: 'p1', priority: 1, role: 'owner', isActive: true },
      { mount: '/dj2', password: 'p2', priority: 1, role: 'guest', isActive: true },
    ],
  }))
  assert.match(script, /dj0 = blank\.detect\(max_blank=10\.0, threshold=-50\.0, dj0\)/)
  assert.match(script, /dj1 = blank\.detect\(max_blank=10\.0, threshold=-50\.0, dj1\)/)
  assert.match(script, /\/harbor\/silence\?dj=%2Fdj1&slot=dj0/)
  assert.match(script, /\/harbor\/silence\?dj=%2Fdj2&slot=dj1/)
  assert.match(script, /fallback\(track_sensitive=false, \[owner_djs, guest_djs, autodj\]\)/)
})

test('normaliza música y jingles con AGC lento y deja las locuciones al TTS', () => {
  const script = generateLiquidsoapScript(baseArgs({
    aiPresenterEvery: 3,
    aiIntrosM3uPath: '/tmp/ai-intros.m3u',
    jinglePlayEvery: 5,
    jinglePlayCount: 1,
    jinglesM3uPath: '/tmp/jingles.m3u',
  }))
  const normalizers = script.match(/lufs=true/g) || []
  assert.equal(normalizers.length, 2, `esperaba 2 normalizadores (música y jingles), hay ${normalizers.length}`)
  assert.match(script, /target=-16\.0/)
  assert.match(script, /window=30\.0/)
  assert.match(script, /announcements = request\.queue\(id="announcements"\)/)
})
