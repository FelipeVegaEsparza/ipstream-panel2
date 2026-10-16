import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lookupGeo } from '../lib/analytics/geo.js'
import { enrichSession } from '../lib/analytics/enrich.js'

test('lookupGeo resuelve una IP pública a país', () => {
  const g = lookupGeo('8.8.8.8')
  assert.equal(g.country, 'US')
})

test('lookupGeo normaliza IPv4 mapeada a IPv6', () => {
  assert.equal(lookupGeo('::ffff:8.8.8.8').country, 'US')
})

test('lookupGeo devuelve nulls para IP privada', () => {
  const g = lookupGeo('10.0.0.1')
  assert.equal(g.country, null)
  assert.equal(g.city, null)
})

test('lookupGeo tolera entradas vacías', () => {
  assert.deepEqual(lookupGeo(null), { country: null, city: null })
  assert.deepEqual(lookupGeo(''), { country: null, city: null })
})

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'

test('enrichSession combina geo y dispositivo', () => {
  const s = enrichSession({ ip: '8.8.8.8', userAgent: IPHONE_UA })
  assert.equal(s.country, 'US')
  assert.equal(s.device, 'mobile')
  assert.ok(s.browser)
})

test('enrichSession no rompe con datos faltantes', () => {
  const s = enrichSession({ ip: '10.0.0.1' })
  assert.equal(s.country, null)
  assert.equal(s.city, null)
  assert.equal(s.device, 'unknown')
  assert.equal(s.userAgent, null)
})
