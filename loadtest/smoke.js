// =====================================================
// Smoke test — verifica que el panel responde y que el login funciona
// =====================================================
//   BASE_URL=https://panel.tudominio.com k6 run loadtest/smoke.js
//
// 1 VU / 1 iteración. Úsalo antes de cualquier prueba grande.

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { baseUrl, requireUsers, ensureLogin, getUser } from './lib.js'

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  requireUsers()
  const base = baseUrl()

  group('health', () => {
    const res = http.get(`${base}/api/health`, { tags: { name: 'health' } })
    check(res, {
      'health: status 200': (r) => r.status === 200,
      'health: {status:ok}': (r) => r.json('status') === 'ok',
    })
  })

  group('login + dashboard', () => {
    const ok = ensureLogin()
    if (!ok) return

    const { clientId } = getUser()
    const res = http.get(
      `${base}/api/dashboard/basic-data?clientId=${clientId}`,
      { tags: { name: 'dashboard_basic_data' } }
    )
    check(res, {
      'basic-data: status 200': (r) => r.status === 200,
      'basic-data: trae datos': (r) => r.json('basicData') !== undefined,
    })
  })

  sleep(1)
}
