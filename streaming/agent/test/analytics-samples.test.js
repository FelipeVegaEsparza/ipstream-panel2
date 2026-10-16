import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRadioSampleRow, buildViewerSampleRow } from '../lib/analytics/parse.js'

const now = new Date('2026-01-01T00:00:00.000Z')

test('buildRadioSampleRow marca online=false cuando no hay mount', () => {
  const row = buildRadioSampleRow({ id: 'r1', clientId: 'c1', bitrate: 128 }, null, now, 'id1')
  assert.equal(row.online, false)
  assert.equal(row.listeners, 0)
  assert.equal(row.peak, 0)
  assert.equal(row.title, null)
  assert.equal(row.artist, null)
  assert.equal(row.timestamp, now)
})

test('buildRadioSampleRow toma listeners y separa artista/título', () => {
  const mount = { listeners: 42, listener_peak: 80, bitrate: 192, title: 'Daft Punk - One More Time' }
  const row = buildRadioSampleRow({ id: 'r1', clientId: 'c1', bitrate: 128 }, mount, now, 'id1')
  assert.equal(row.online, true)
  assert.equal(row.listeners, 42)
  assert.equal(row.peak, 80)
  assert.equal(row.artist, 'Daft Punk')
  assert.equal(row.title, 'One More Time')
  assert.equal(row.bitrate, 128)
})

test('buildViewerSampleRow marca online=false si el stream está off', () => {
  const row = buildViewerSampleRow({ id: 'v1', clientId: 'c1', status: 'off' }, 99, now, 'id1')
  assert.equal(row.online, false)
  assert.equal(row.viewers, 0)
})

test('buildViewerSampleRow toma viewers si el stream está al aire', () => {
  const row = buildViewerSampleRow({ id: 'v1', clientId: 'c1', status: 'autodj' }, 7, now, 'id1')
  assert.equal(row.online, true)
  assert.equal(row.viewers, 7)
})
