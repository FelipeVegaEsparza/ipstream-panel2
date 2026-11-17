import { test } from 'node:test'
import assert from 'node:assert/strict'

// config.js valida estas variables al importar collect.js / video-viewers.js.
process.env.STREAMING_AGENT_TOKEN ||= 'test-token'
process.env.HARBOR_CALLBACK_SECRET ||= 'test-secret'
process.env.DB_USER ||= 'test'
process.env.DB_PASSWORD ||= 'test'
process.env.DB_DATABASE ||= 'test'
process.env.ICE_ADMIN_USER ||= 'test'
process.env.ICE_ADMIN_PASSWORD ||= 'test'
process.env.ICE_SOURCE_PASSWORD ||= 'test'
process.env.ICE_RELAY_PASSWORD ||= 'test'
process.env.ICE_HOSTNAME ||= 'test'
process.env.HARBOR_PUBLIC_HOSTNAME ||= 'test'

const { readCaddyLog } = await import('../lib/analytics/collect.js')
const { readViewersFromLog } = await import('../lib/video-viewers.js')
const { logger } = await import('../lib/logger.js')

test('readCaddyLog completa una lectura de 5 MB con maxBuffer suficiente', async () => {
  const big = 'x'.repeat(5_000_000)
  let captured

  const lines = await readCaddyLog('/data/stream-access.log', async (cmd, opts) => {
    captured = { cmd, opts }
    return big
  })

  assert.equal(lines.length, 1)
  assert.equal(lines[0].length, 5_000_000)
  assert.ok(captured.opts.maxBuffer >= 10_000_000)
  assert.ok(!captured.cmd.includes('2>/dev/null'))
})

test('readCaddyLog registra una advertencia y devuelve [] si falla', async () => {
  const originalWarn = logger.warn
  let warned = false
  logger.warn = () => {
    warned = true
  }

  try {
    const lines = await readCaddyLog('/data/stream-access.log', async () => {
      throw new Error('stdout maxBuffer length exceeded')
    })

    assert.deepEqual(lines, [])
    assert.equal(warned, true)
  } finally {
    logger.warn = originalWarn
  }
})

test('readViewersFromLog cuenta IPs únicas de VOD2Live y SRS', async () => {
  const now = Math.floor(Date.now() / 1000)
  const entry = (uri, ip, ts = now) =>
    JSON.stringify({ ts, request: { uri, remote_ip: ip } })

  const log = [
    entry('/vod/tv_abcdef012345/live.m3u8', '1.1.1.1'),
    entry('/vod/tv_abcdef012345/live/1080p.m3u8', '2.2.2.2'),
    entry('/vod/tv_abcdef012345/seg/1080p/t1/s1.ts', '1.1.1.1'),
    entry('/live/tv_abcdef012345.m3u8', '3.3.3.3'),
    entry('/dj/tv_abcdef012345.m3u8', '5.5.5.5'),
    entry('/tv/tv_abcdef012345.m3u8', '4.4.4.4'),
    entry('/vod/tv_abcdef012345/live.m3u8', '9.9.9.9', now - 3600),
  ].join('\n')

  let captured
  const viewers = await readViewersFromLog(30_000, {
    run: async (cmd, opts) => {
      captured = { cmd, opts }
      return log
    },
  })

  assert.deepEqual(viewers, { tv_abcdef012345: 4 })
  assert.ok(captured.opts.maxBuffer >= 2_000_000)
  assert.ok(captured.cmd.includes('m3u8'))
  assert.ok(captured.cmd.includes('/seg/'))
})
