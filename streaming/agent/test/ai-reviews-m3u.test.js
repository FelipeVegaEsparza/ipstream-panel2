import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'path'

const { aiLayersEnabled, buildAiLayerLines } = await import('../lib/m3u-layers.js')

const introDir = '/radio/client/ai-intros'
const reviewDir = '/radio/client/ai-reviews'

test('solo reseña: no agrega intro', () => {
  const lines = buildAiLayerLines({
    trackId: 'track-1',
    introByTrack: new Map(),
    reviewByTrack: new Map([['track-1', 'rv-0002-track-1.mp3']]),
    introDir,
    reviewDir,
  })

  assert.deepEqual(lines, [
    '#EXTINF:-1,Reseña IA',
    join(reviewDir, 'rv-0002-track-1.mp3'),
  ])
})

test('intro y reseña: el orden es presentación, reseña y tema', () => {
  const lines = buildAiLayerLines({
    trackId: 'track-1',
    introByTrack: new Map([['track-1', 'ia-0002-track-1.mp3']]),
    reviewByTrack: new Map([['track-1', 'rv-0002-track-1.mp3']]),
    introDir,
    reviewDir,
  })

  assert.deepEqual(lines, [
    '#EXTINF:-1,Locutor IA',
    join(introDir, 'ia-0002-track-1.mp3'),
    '#EXTINF:-1,Reseña IA',
    join(reviewDir, 'rv-0002-track-1.mp3'),
  ])
})

test('sin reseña: solo la intro si corresponde', () => {
  const lines = buildAiLayerLines({
    trackId: 'track-1',
    introByTrack: new Map([['track-1', 'ia-0002-track-1.mp3']]),
    reviewByTrack: new Map(),
    introDir,
    reviewDir,
  })

  assert.deepEqual(lines, [
    '#EXTINF:-1,Locutor IA',
    join(introDir, 'ia-0002-track-1.mp3'),
  ])
})

test('la reseña se apaga con frecuencia 0, kill switch o shuffle', () => {
  assert.equal(aiLayersEnabled({ aiReviewEveryTracks: 5, aiReviewAdminEnabled: true }).reviews, true)
  assert.equal(aiLayersEnabled({ aiReviewEveryTracks: 0, aiReviewAdminEnabled: true }).reviews, false)
  assert.equal(aiLayersEnabled({ aiReviewEveryTracks: 5, aiReviewAdminEnabled: false }).reviews, false)
  assert.equal(aiLayersEnabled({ aiReviewEveryTracks: 5, aiReviewAdminEnabled: true }, true).reviews, false)
})

test('las intros mantienen su propia frecuencia', () => {
  assert.equal(aiLayersEnabled({ aiPresenterEnabled: true, aiPresenterEvery: 3 }).intros, true)
  assert.equal(aiLayersEnabled({ aiPresenterEnabled: false, aiPresenterEvery: 3 }).intros, false)
  assert.equal(aiLayersEnabled({ aiPresenterEnabled: true, aiPresenterEvery: 0 }).intros, false)
})
