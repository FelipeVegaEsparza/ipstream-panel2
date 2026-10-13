// =====================================================
// Test mixto — panel autenticado + espectadores de la PWA a la vez
// =====================================================
//   BASE_URL=... PANEL_VUS=100 PUBLIC_VUS=300 k6 run loadtest/mixed.js
//
// Corre dos escenarios concurrentes sobre el mismo proceso Node:
//   - panel:  operadores autenticados (login 1 vez + 5 lecturas de dashboard).
//   - public: espectadores de la PWA (3 lecturas públicas, sin login).
// Sirve para ver cómo se reparte la capacidad total entre ambos.

import http from 'k6/http'
import { check, sleep } from 'k6'
import { baseUrl, requireUsers, ensureLogin, getUser } from './lib.js'

const PANEL_VUS = parseInt(__ENV.PANEL_VUS || '100', 10)
const PUBLIC_VUS = parseInt(__ENV.PUBLIC_VUS || '300', 10)
const HOLD = __ENV.LOAD_HOLD || '3m'

export const options = {
  scenarios: {
    panel: {
      executor: 'ramping-vus',
      exec: 'panelFlow',
      startVUs: 0,
      stages: [
        { duration: '1m', target: PANEL_VUS },
        { duration: HOLD, target: PANEL_VUS },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
    public: {
      executor: 'ramping-vus',
      exec: 'publicFlow',
      startVUs: 0,
      stages: [
        { duration: '1m', target: PUBLIC_VUS },
        { duration: HOLD, target: PUBLIC_VUS },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    'http_req_duration{name:panel_basic_data}': ['p(95)<100000'],
    'http_req_duration{name:public_basic}': ['p(95)<100000'],
    'http_req_duration{name:public_news}': ['p(95)<100000'],
    'http_req_duration{name:public_programs}': ['p(95)<100000'],
    'http_req_duration{name:auth_login}': ['p(95)<100000'],
  },
}

export function panelFlow() {
  requireUsers()
  if (!ensureLogin()) return
  const base = baseUrl()
  const { clientId } = getUser()

  http
    .batch([
      ['GET', `${base}/api/dashboard/basic-data?clientId=${clientId}`, null, { tags: { name: 'panel_basic_data' } }],
      ['GET', `${base}/api/dashboard/onboarding`, null, { tags: { name: 'panel_onboarding' } }],
      ['GET', `${base}/api/dashboard/chat/stats`, null, { tags: { name: 'panel_chat_stats' } }],
      ['GET', `${base}/api/dashboard/support/unread-summary`, null, { tags: { name: 'panel_support_unread' } }],
      ['GET', `${base}/api/dashboard/contact-messages/unread-count`, null, { tags: { name: 'panel_contact_unread' } }],
    ])
    .forEach((res) => check(res, { 'panel 200': (r) => r.status === 200 }))

  sleep(6 + Math.random() * 8)
}

export function publicFlow() {
  requireUsers()
  const base = baseUrl()
  const { clientId } = getUser()

  http
    .batch([
      ['GET', `${base}/api/public/${clientId}/basic-data`, null, { tags: { name: 'public_basic' } }],
      ['GET', `${base}/api/public/${clientId}/news?page=1&limit=10`, null, { tags: { name: 'public_news' } }],
      ['GET', `${base}/api/public/${clientId}/programs`, null, { tags: { name: 'public_programs' } }],
    ])
    .forEach((res) => check(res, { 'public 200': (r) => r.status === 200 }))

  sleep(2 + Math.random() * 3)
}
