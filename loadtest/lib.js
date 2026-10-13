// =====================================================
// Helpers compartidos para los tests de carga (k6)
// =====================================================
// Este módulo es código para el runtime de k6 (no Node): no importa de
// node_modules. Lee `users.json` generado por `seed-users.js`.

import http from 'k6/http'
import { check, fail } from 'k6'
import { SharedArray } from 'k6/data'

export const users = new SharedArray('loadtest-users', function () {
  return JSON.parse(open('./users.json'))
})

export function requireUsers() {
  if (!users || users.length === 0) {
    fail('users.json está vacío. Corre primero: node loadtest/seed-users.js')
  }
}

export function baseUrl() {
  return (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

// Cada VU consume una cuenta distinta (1 login por VU). Si hay más VUs que
// usuarios, se reutilizan cuentas; siembra al menos tantos usuarios como VUs
// máximos esperes para no chocar con el rate-limit de login.
export function getUser() {
  const idx = ((__VU - 1) % users.length + users.length) % users.length
  return users[idx]
}

function hasSessionCookie(jar, base) {
  const cookies = jar.cookiesForURL(base)
  return Object.keys(cookies).some((name) => name.includes('session-token'))
}

// Login contra NextAuth (CredentialsProvider). Devuelve true si quedó una
// cookie de sesión en el cookie jar del VU.
export function login(email, password) {
  const base = baseUrl()

  const csrfRes = http.get(`${base}/api/auth/csrf`, { tags: { name: 'auth_csrf' } })
  let csrfToken = null
  try {
    csrfToken = csrfRes.json('csrfToken')
  } catch (e) {
    csrfToken = null
  }

  if (!csrfToken) {
    check(csrfRes, { 'auth: csrf obtenido': () => false })
    return false
  }

  const res = http.post(
    `${base}/api/auth/callback/credentials`,
    { csrfToken, email, password, callbackUrl: `${base}/dashboard`, json: 'true' },
    { redirects: 0, tags: { name: 'auth_login' } }
  )

  const jar = http.cookieJar()
  const hasSession = hasSessionCookie(jar, base)
  const statusOk = res.status === 200 || (res.status >= 300 && res.status < 400)

  check(res, {
    'login: status 2xx/3xx': () => statusOk,
    'login: cookie de sesión': () => hasSession,
  })

  return statusOk && hasSession
}

// Cachea la sesión por VU: solo se hace login una vez por VU (el JWT dura 30
// días por defecto). Reutilizar la sesión evita golpear el rate-limit.
let sessionReady = false

export function ensureLogin() {
  if (sessionReady) return true
  const u = getUser()
  sessionReady = login(u.email, u.password)
  return sessionReady
}

export function tagParams(name) {
  return { tags: { name } }
}
