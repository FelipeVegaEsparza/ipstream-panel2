// =====================================================
// MySQL pool (mysql2/promise)
// Usamos el mismo MySQL que el IPStream Panel.
// =====================================================

import mysql from 'mysql2/promise'
import { config } from './config.js'

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4',
  decimalNumbers: true,
  dateStrings: false,
})

export async function dbHealthCheck() {
  const conn = await pool.getConnection()
  try {
    await conn.query('SELECT 1')
    return true
  } finally {
    conn.release()
  }
}
