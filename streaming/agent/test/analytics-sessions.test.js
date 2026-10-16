import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRadioSessions, parseViewerSessions, makeSignature } from '../lib/analytics/parse.js'

function line(obj) {
  return JSON.stringify(obj)
}

const radioLine = (over = {}) => line({
  ts: 1700000000,
  request: {
    method: 'GET',
    uri: '/radio_abcd',
    remote_ip: '1.2.3.4',
    headers: { 'User-Agent': ['Mozilla/5.0 (X11; Linux)'] },
  },
  duration: 12.5,
  size: 1024,
  status: 200,
  ...over,
})

test('parseRadioSessions extrae una sesión del mount', () => {
  const mountMap = new Map([['radio_abcd', { clientId: 'c1', radioStreamId: 'r1' }]])
  const out = parseRadioSessions([radioLine()], mountMap)
  assert.equal(out.length, 1)
  assert.equal(out[0].clientId, 'c1')
  assert.equal(out[0].streamId, 'r1')
  assert.equal(out[0].ip, '1.2.3.4')
  assert.equal(out[0].durationSeconds, 13)
  assert.equal(out[0].bytes, 1024)
  assert.equal(out[0].userAgent, 'Mozilla/5.0 (X11; Linux)')
})

test('parseRadioSessions ignora duplicados por firma', () => {
  const mountMap = new Map([['radio_abcd', { clientId: 'c1', radioStreamId: 'r1' }]])
  const out = parseRadioSessions([radioLine(), radioLine()], mountMap)
  assert.equal(out.length, 1)
})

test('parseRadioSessions ignora peticiones que no son de un mount conocido', () => {
  const mountMap = new Map([['radio_abcd', { clientId: 'c1', radioStreamId: 'r1' }]])
  const nonAudio = [
    line({ ts: 1, request: { method: 'GET', uri: '/status-json.xsl', remote_ip: '2.2.2.2' }, duration: 0, size: 0 }),
    line({ ts: 2, request: { method: 'GET', uri: '/admin/stats', remote_ip: '2.2.2.2' }, duration: 0, size: 0 }),
    line({ ts: 3, request: { method: 'GET', uri: '/radio_otro', remote_ip: '2.2.2.2' }, duration: 0, size: 0 }),
  ]
  assert.equal(parseRadioSessions(nonAudio, mountMap).length, 0)
})

test('parseRadioSessions ignora líneas sin ip o sin ts inválidas', () => {
  const mountMap = new Map([['radio_abcd', { clientId: 'c1', radioStreamId: 'r1' }]])
  const bad = [
    'no-json',
    line({ ts: 1, request: { method: 'GET', uri: '/radio_abcd' }, duration: 0, size: 0 }),
    line({ request: { method: 'GET', uri: '/radio_abcd', remote_ip: '1.2.3.4' }, duration: 0, size: 0 }),
  ]
  assert.equal(parseRadioSessions(bad, mountMap).length, 0)
})

test('parseViewerSessions extrae sesiones de manifiestos .m3u8', () => {
  const keyMap = new Map([['tv_abcdef012345', { clientId: 'c1', videoStreamId: 'v1' }]])
  const lines = [
    line({ ts: 10, request: { method: 'GET', uri: '/live/tv_abcdef012345.m3u8', remote_ip: '5.5.5.5' }, duration: 30, size: 2048 }),
    line({ ts: 11, request: { method: 'GET', uri: '/dj/tv_abcdef012345.m3u8?x=1', remote_ip: '5.5.5.5' }, duration: 4, size: 100 }),
    line({ ts: 12, request: { method: 'GET', uri: '/live/tv_zzz.m3u8', remote_ip: '5.5.5.5' }, duration: 1, size: 1 }),
  ]
  const out = parseViewerSessions(lines, keyMap)
  assert.equal(out.length, 2)
  assert.equal(out[0].clientId, 'c1')
  assert.equal(out[0].streamId, 'v1')
  assert.equal(out[0].durationSeconds, 30)
})

test('makeSignature es estable y de 64 chars', () => {
  const a = makeSignature([1, '1.2.3.4', 'radio_abcd', 10, 5])
  const b = makeSignature([1, '1.2.3.4', 'radio_abcd', 10, 5])
  assert.equal(a, b)
  assert.equal(a.length, 64)
})
