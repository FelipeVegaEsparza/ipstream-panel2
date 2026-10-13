// =====================================================
// Carga de lecturas públicas — simula usuarios finales (PWA del cliente)
// =====================================================
//   BASE_URL=https://panel.tudominio.com k6 run loadtest/public.js
//   BASE_URL=... K6_PROFILE=soak k6 run loadtest/public.js
//
// No requiere login. Usa el clientId de los usuarios sembrados para pedir el
// contenido público (lo que consumen los oyentes).

import http from 'k6/http'
import { check, sleep } from 'k6'
import { baseUrl, requireUsers, getUser } from './lib.js'

const PROFILES = {
  ramp: [
    { duration: '1m', target: 25 },
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  soak: [
    { duration: '1m', target: 50 },
    { duration: '30m', target: 50 },
    { duration: '1m', target: 0 },
  ],
}

export const options = {
  scenarios: {
    public_reads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: PROFILES[__ENV.K6_PROFILE] || PROFILES.ramp,
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.02'],
    'http_req_duration{scenario:public_reads}': ['p(95)<800', 'p(99)<1500'],
  },
}

export default function () {
  requireUsers()
  const base = baseUrl()
  const { clientId } = getUser()

  const responses = http.batch([
    ['GET', `${base}/api/public/${clientId}/basic-data`, null, { tags: { name: 'public_basic_data' } }],
    ['GET', `${base}/api/public/${clientId}/news?page=1&limit=10`, null, { tags: { name: 'public_news' } }],
    ['GET', `${base}/api/public/${clientId}/programs`, null, { tags: { name: 'public_programs' } }],
  ])

  check(responses[0], { 'public basic-data 200': (r) => r.status === 200 })
  check(responses[1], { 'public news 200': (r) => r.status === 200 })
  check(responses[2], { 'public programs 200': (r) => r.status === 200 })

  sleep(Math.random() * 2 + 1)
}
