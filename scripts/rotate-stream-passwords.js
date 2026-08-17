#!/usr/bin/env node
// =====================================================
// Rota los passwords de streaming (source + live) de todos los RadioStreams.
// Usa la ENCRYPTION_KEY actual del entorno, por lo que se debe ejecutar
// DESPUÉS de cambiar la key y reconstruir/reiniciar los contenedores.
//
// Uso dentro del contenedor app:
//   cat scripts/rotate-stream-passwords.js | docker exec -i ipstream-app node -
//
// O directamente si el repo está montado:
//   docker exec ipstream-app node scripts/rotate-stream-passwords.js
// =====================================================

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function getKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  let buf
  if (/^[a-f0-9]{64}$/i.test(key)) {
    buf = Buffer.from(key, 'hex')
  } else {
    buf = Buffer.from(key, 'base64')
  }
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser 32 bytes en hex (64 chars) o base64')
  }
  return buf
}

function encrypt(text) {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const streams = await prisma.radioStream.findMany({
      select: { id: true, clientId: true },
    })

    if (streams.length === 0) {
      console.log('No hay RadioStreams para rotar')
      return
    }

    for (const s of streams) {
      const sourcePassword = crypto.randomBytes(12).toString('hex')
      const livePassword = crypto.randomBytes(12).toString('hex')

      await prisma.radioStream.update({
        where: { id: s.id },
        data: {
          sourcePasswordEnc: encrypt(sourcePassword),
          livePasswordEnc: encrypt(livePassword),
          updatedAt: new Date(),
        },
      })

      console.log(`✓ Passwords rotados para clientId=${s.clientId}`)
    }

    console.log(`\nTotal: ${streams.length} RadioStream(s) actualizado(s)`)
    console.log('Ahora reinicia el streaming-agent para que vuelva a desplegar icecast.xml')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Error rotando passwords:', err.message)
  process.exit(1)
})
