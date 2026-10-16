import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyUserAgent } from '../lib/analytics/ua.js'

test('detecta móvil', () => {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  assert.equal(classifyUserAgent(ua).device, 'mobile')
})

test('detecta escritorio', () => {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  const r = classifyUserAgent(ua)
  assert.equal(r.device, 'desktop')
  assert.equal(r.browser, 'Chrome')
})

test('detecta TV', () => {
  const ua = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/537.36 (KHTML, like Gecko)'
  assert.equal(classifyUserAgent(ua).device, 'tv')
})

test('user-agent desconocido', () => {
  assert.equal(classifyUserAgent('').device, 'unknown')
  assert.equal(classifyUserAgent(null).device, 'unknown')
  assert.equal(classifyUserAgent(undefined).device, 'unknown')
})
