import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

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

const library = await mkdtemp(join(tmpdir(), 'ai-reviews-'))
process.env.RADIO_LIBRARY_PATH = library

const {
  parseAiReviewFileName,
  saveAiReview,
  listAiReviewFiles,
  clearAiReviews,
} = await import('../lib/files.js')

test.after(async () => {
  await rm(library, { recursive: true, force: true })
})

test('extrae el trackId del nombre de la reseña', () => {
  assert.equal(parseAiReviewFileName('rv-0001-abc123.mp3'), 'abc123')
  assert.equal(parseAiReviewFileName('rv-0012-track_9-x.mp3'), 'track_9-x')
  assert.equal(parseAiReviewFileName('ia-0001-abc123.mp3'), null)
  assert.equal(parseAiReviewFileName('rv-0001.mp3'), null)
  assert.equal(parseAiReviewFileName('rv-0001-abc123.wav'), null)
})

test('lista las reseñas en orden y las limpia', async () => {
  await saveAiReview('client-a', 'rv-0002-b.mp3', Buffer.from('b'))
  await saveAiReview('client-a', 'rv-0001-a.mp3', Buffer.from('a'))
  await saveAiReview('client-a', 'rv-0010-c.mp3', Buffer.from('c'))

  assert.deepEqual(await listAiReviewFiles('client-a'), [
    'rv-0001-a.mp3',
    'rv-0002-b.mp3',
    'rv-0010-c.mp3',
  ])

  await clearAiReviews('client-a')
  assert.deepEqual(await listAiReviewFiles('client-a'), [])
})
