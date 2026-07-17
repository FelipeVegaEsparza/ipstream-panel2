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

export const config = {
  port: intEnv('PORT', 4000),
  host: required('HOST', '0.0.0.0'),
  logLevel: required('LOG_LEVEL', 'info'),
  nodeEnv: required('NODE_ENV', 'production'),

  // Auth
  agentToken: required('STREAMING_AGENT_TOKEN', 'dev-agent-token-change-me'),

  // DB
  db: {
    host: required('DB_HOST', 'db'),
    port: intEnv('DB_PORT', 3306),
    user: required('DB_USER', 'ipstream'),
    password: required('DB_PASSWORD', 'ipstream_secret'),
    database: required('DB_DATABASE', 'ipstream_panel'),
    connectionLimit: intEnv('DB_CONNECTION_LIMIT', 10),
  },

  // Icecast
  ice: {
    host: required('ICE_HOST', 'icecast'),
    port: intEnv('ICE_PORT', 8000),
    adminUser: required('ICE_ADMIN_USER', 'admin'),
    adminPassword: required('ICE_ADMIN_PASSWORD', 'hackme'),
    // Password que los SOURCES (liquidsoap, DJ) usan para conectar.
    // Compartido por ahora (todos los mounts usan el mismo).
    sourcePassword: required('ICE_SOURCE_PASSWORD', 'hackme'),
  },

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
