// =====================================================
// Carga del panel autenticado — simula operadores/dueños de emisoras
// =====================================================
//   BASE_URL=https://panel.tudominio.com k6 run loadtest/dashboard.js
//   BASE_URL=... K6_PROFILE=soak k6 run loadtest/dashboard.js
//
// Cada VU hace login UNA vez (reutiliza la cookie de sesión) y luego recorre
// endpoints de lectura del dashboard. Siembra al menos tantos usuarios como
// VUs máximos: el login tiene rate-limit de 10 intentos / 15 min por email.

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { baseUrl, requireUsers, ensureLogin, getUser } from './lib.js'

const PROFILES = {
  ramp: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 25 },
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
    dashboard: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: PROFILES[__ENV.K6_PROFILE] || PROFILES.ramp,
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:dashboard}': ['p(95)<700', 'p(99)<1500'],
  },
}

export default function () {
  requireUsers()
  const base = baseUrl()
  const { clientId } = getUser()

  if (!ensureLogin()) {
    return
  }

  group('dashboard reads', () => {
    const responses = http.batch([
      ['GET', `${base}/api/dashboard/basic-data?clientId=${clientId}`, null, { tags: { name: 'dash_basic_data' } }],
      ['GET', `${base}/api/dashboard/onboarding`, null, { tags: { name: 'dash_onboarding' } }],
      ['GET', `${base}/api/dashboard/chat/stats`, null, { tags: { name: 'dash_chat_stats' } }],
      ['GET', `${base}/api/dashboard/support/unread-summary`, null, { tags: { name: 'dash_support_unread' } }],
      ['GET', `${base}/api/dashboard/contact-messages/unread-count`, null, { tags: { name: 'dash_contact_unread' } }],
    ])

    const names = ['basic-data', 'onboarding', 'chat/stats', 'support/unread-summary', 'contact-messages/unread-count']
    responses.forEach((res, i) => {
      check(res, { [`dash ${names[i]} 200`]: (r) => r.status === 200 })
    })
  })

  sleep(Math.random() * 2 + 1)
}
