// =====================================================
// IPStream Streaming Agent — config
// Carga y valida las variables de entorno al arranque.
// =====================================================

import 'dotenv/config'

function required(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback
    throw new Error(`Variable de entorno requerida: ${name}`)
  }
  return v
}

function intEnv(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  const n = parseInt(v, 10)
  if (Number.isNaN(n)) throw new Error(`${name} debe ser un entero, recibido: ${v}`)
  return n
}

function listEnv(name, fallback) {
  const v = process.env[name]
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback
    return []
  }
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

export const config = {
  port: intEnv('PORT', 4000),
  host: required('HOST', '0.0.0.0'),
  logLevel: required('LOG_LEVEL', 'info'),
  nodeEnv: required('NODE_ENV', 'production'),

  // Auth
  agentToken: required('STREAMING_AGENT_TOKEN'),
  harborCallbackSecret: required('HARBOR_CALLBACK_SECRET'),
  corsAllowedOrigins: listEnv('CORS_ALLOWED_ORIGINS'),

  // DB
  db: {
    host: required('DB_HOST', 'db'),
    port: intEnv('DB_PORT', 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_DATABASE'),
    connectionLimit: intEnv('DB_CONNECTION_LIMIT', 10),
  },

  // Icecast
  ice: {
    host: required('ICE_HOST', 'icecast'),
    port: intEnv('ICE_PORT', 8000),
    adminUser: required('ICE_ADMIN_USER'),
    adminPassword: required('ICE_ADMIN_PASSWORD'),
    // Password compartida de fallback. En producción cada mount usa su propia
    // livePassword descifrada desde la DB (ver icecast-config.js).
    sourcePassword: required('ICE_SOURCE_PASSWORD'),
    relayPassword: required('ICE_RELAY_PASSWORD'),
    hostname: required('ICE_HOSTNAME'),
  },

  // Public hostname DJs use to reach the Liquidsoap harbor input
  harborPublicHostname: required('HARBOR_PUBLIC_HOSTNAME'),

  // Liquidsoap
  liquidsoap: {
    bin: required('LIQUIDSOAP_BIN', '/usr/bin/liquidsoap'),
    scriptsPath: required('LIQUIDSOAP_SCRIPTS_PATH', '/etc/liquidsoap/scripts'),
    logPath: required('LIQUIDSOAP_LOG_PATH', '/var/log/liquidsoap'),
    telnetBasePort: intEnv('LIQUIDSOAP_TELNET_BASE_PORT', 12340),
    host: required('LIQUIDSOAP_HOST', 'liquidsoap'),
  },

  // Radio library
  library: {
    path: required('RADIO_LIBRARY_PATH', '/var/lib/radio'),
  },
}
