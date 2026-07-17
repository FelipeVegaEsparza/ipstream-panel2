// =====================================================
// AES-256-GCM — formato compatible con lib/encryption.ts del panel
// Formato: "iv:tag:ciphertext" todo en hex
// Key: 32 bytes en hex (64 chars), leída de process.env.ENCRYPTION_KEY
// =====================================================

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (key.length !== 64) {
    throw new Error(`ENCRYPTION_KEY debe ser hex de 64 chars (32 bytes), recibido ${key.length} chars`)
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(text) {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText) {
  const key = getKey()
  const parts = encryptedText.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format (expected iv:tag:ciphertext)')
  }
  const [ivHex, tagHex, encrypted] = parts
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function isEncrypted(value) {
  return /^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/i.test(value)
}
