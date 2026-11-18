// =====================================================
// Programa de referidos — códigos y enlaces
// =====================================================

import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import {
  REFERRAL_CODE_MAX_LENGTH,
  REFERRAL_CODE_MIN_LENGTH,
  REFERRAL_CODE_PREFIX,
} from './constants'

const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_GENERATION_ATTEMPTS = 6

export function slugifyReferralName(name: string, max = 8): string {
  const normalized = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
  return (normalized || 'RADIO').slice(0, max)
}

function randomSuffix(length = 3): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += SUFFIX_ALPHABET[randomInt(0, SUFFIX_ALPHABET.length)]
  }
  return out
}

/** Genera un código con el formato CAST-<NOMBRE><SUFIJO>. */
export function buildReferralCode(name: string, suffix?: string): string {
  const tail = (suffix || randomSuffix()).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return `${REFERRAL_CODE_PREFIX}${slugifyReferralName(name)}${tail}`.slice(
    0,
    REFERRAL_CODE_MAX_LENGTH
  )
}

export function normalizeReferralCode(code: string | null | undefined): string {
  return (code || '').trim().toUpperCase()
}

export function isValidReferralCodeFormat(code: string | null | undefined): boolean {
  const normalized = normalizeReferralCode(code)
  if (normalized.length < REFERRAL_CODE_MIN_LENGTH) return false
  if (normalized.length > REFERRAL_CODE_MAX_LENGTH) return false
  return /^CAST-[A-Z0-9]+$/.test(normalized)
}

/**
 * Devuelve el código del cliente, generándolo si aún no existe. Es idempotente:
 * si dos peticiones compiten, solo una escribe y la otra relee el código ganador.
 */
export async function ensureReferralCode(clientId: string, db: any = prisma): Promise<string> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, referralCode: true },
  })
  if (!client) throw new Error('Cliente no encontrado')
  if (client.referralCode) return client.referralCode

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = buildReferralCode(client.name, randomSuffix(attempt >= 4 ? 6 : 3))
    const taken = await db.client.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })
    if (taken) continue

    const updated = await db.client.updateMany({
      where: { id: clientId, referralCode: null },
      data: { referralCode: code },
    })
    if (updated?.count === 1) return code

    const fresh = await db.client.findUnique({
      where: { id: clientId },
      select: { referralCode: true },
    })
    if (fresh?.referralCode) return fresh.referralCode
  }

  throw new Error('No se pudo generar un código de referido único')
}

export function normalizeBaseUrl(baseUrl: string | null | undefined): string {
  const raw = (baseUrl || '').trim()
  if (!raw) return 'https://casterfly.com'
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

/** Construye el enlace público de invitación. */
export function buildReferralLink(code: string, baseUrl?: string | null): string {
  return `${normalizeBaseUrl(baseUrl)}/registro?ref=${encodeURIComponent(code)}`
}

/** Dominio público configurado (app_config o env), con fallback a casterfly.com. */
export async function getReferralBaseUrl(db: any = prisma): Promise<string> {
  try {
    const config = await db.appConfig.findFirst({
      select: { clientSitesDomain: true },
    })
    if (config?.clientSitesDomain) return normalizeBaseUrl(config.clientSitesDomain)
  } catch {
    // Sin DB disponible: se usa el fallback.
  }
  if (process.env.CLIENT_SITES_DOMAIN) return normalizeBaseUrl(process.env.CLIENT_SITES_DOMAIN)
  if (process.env.NEXT_PUBLIC_SITE_URL) return normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL)
  return 'https://casterfly.com'
}
