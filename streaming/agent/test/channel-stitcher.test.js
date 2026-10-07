import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseVodPlaylist,
  buildCycle,
  buildLiveManifest,
  buildMasterManifest,
} from '../lib/channel-stitcher.js'

test('buildCycle arma el timeline plano y las discontinuidades', () => {
  const assets = [
    { trackId: 't1', segments: [{ uri: 'seg_00000.ts', dur: 2 }, { uri: 'seg_00001.ts', dur: 2 }] },
    { trackId: 't2', segments: [{ uri: 'seg_00000.ts', dur: 2 }] },
  ]
  const c = buildCycle(assets)
  assert.equal(c.flat.length, 3)
  assert.equal(c.total, 6000)
  assert.equal(c.flat[0].cumStart, 0)
  assert.equal(c.flat[1].cumStart, 2000)
  assert.equal(c.flat[2].cumStart, 4000)
  // 1 cambio de asset (t1->t2) + 1 por el wrap
  assert.equal(c.discontPerCycle, 2)
})

test('buildLiveManifest mapea cada segmento por índice con la URL de la rendición', () => {
  const cycle = buildCycle([
    { trackId: 't1', segments: [{ uri: 'seg_00000.ts', dur: 2 }] },
  ])
  const urls = []
  const body = buildLiveManifest(cycle, 0, 0, {
    windowSize: 1,
    segmentUrl: (trackId, file) => {
      urls.push([trackId, file])
      return `/seg/720p/${trackId}/${file}`
    },
  })
  assert.match(body, /#EXTM3U/)
  assert.match(body, /seg_00000\.ts/)
  assert.equal(urls[0][0], 't1')
  assert.equal(urls[0][1], 'seg_00000.ts')
})

test('buildMasterManifest lista las variantes con bandwidth y resolución', () => {
  const body = buildMasterManifest([
    { name: '1080p', width: 1920, height: 1080, bitrateKbps: 2000 },
    { name: '720p', width: 1280, height: 720, bitrateKbps: 1000 },
  ])
  assert.match(body, /#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080/)
  assert.match(body, /#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720/)
  assert.match(body, /live\/1080p\.m3u8/)
  assert.match(body, /live\/720p\.m3u8/)
})

test('parseVodPlaylist extrae duraciones y uris', () => {
  const text = '#EXTM3U\n#EXTINF:2.000,\nseg_00000.ts\n#EXTINF:2.000,\nseg_00001.ts\n'
  const { segments, total } = parseVodPlaylist(text)
  assert.equal(segments.length, 2)
  assert.equal(total, 4)
})
