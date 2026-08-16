// =====================================================
// Plan caps — helpers para leer topes del Plan del cliente.
// Hoy: maxDjs (entero, default 4). No soporta null/ilimitado.
// Si en el futuro se quiere ilimitado, se modela como sentinel o columna nueva.
// =====================================================

import { pool } from './db.js'

export const DEFAULT_MAX_DJS = 4

/**
 * Devuelve el cap de DJs para el cliente dado (Plan.maxDjs).
 * Si el plan es NULL o no existe, devuelve DEFAULT_MAX_DJS (defensa contra datos legacy).
 *
 * @param {string} clientId
 * @returns {Promise<number>}
 */
export async function getPlanMaxDjs(clientId) {
  if (!clientId) return DEFAULT_MAX_DJS

  const [rows] = await pool.query(
    `SELECT p.maxDjs
       FROM clients c
       LEFT JOIN plans p ON p.id = c.planId
      WHERE c.id = ?
      LIMIT 1`,
    [clientId]
  )

  if (rows.length === 0) return DEFAULT_MAX_DJS

  const value = rows[0].maxDjs
  // Defensa contra NULL legado (la columna es NOT NULL post-migración, pero un
  // JOIN LEFT con plan inexistente puede devolver NULL).
  if (value === null || value === undefined) return DEFAULT_MAX_DJS

  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX_DJS

  return Math.floor(n)
}