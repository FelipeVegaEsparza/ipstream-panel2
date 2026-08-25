#!/usr/bin/env node
// =====================================================
// Seed del servidor de streaming principal.
//
// Crea (si no existe) el "Servidor Principal" a partir de los env actuales
// del panel (STREAMING_AGENT_URL, STREAMING_AGENT_TOKEN, ICE_PUBLIC_URL,
// HARBOR_PUBLIC_HOSTNAME, RTMP_RELAY_PUBLIC_HOST) y asigna a él todos los
// RadioStream/VideoStream existentes que no tengan serverId.
//
// Uso dentro del contenedor app:
//   docker exec ipstream-app node scripts/seed-streaming-server.js
// =====================================================

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

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

function publicHostnameFromEnv() {
  return (
    process.env.ICE_PUBLIC_URL?.replace(/^https?:\/\//, '').split(':')[0] ||
    process.env.HARBOR_PUBLIC_HOSTNAME ||
    process.env.RTMP_RELAY_PUBLIC_HOST ||
    process.env.ICE_HOSTNAME ||
    'localhost'
  )
}

async function main() {
  const baseUrl = process.env.STREAMING_AGENT_URL || 'http://agent:4000'
  const token = process.env.STREAMING_AGENT_TOKEN || ''

  if (!token) {
    throw new Error('STREAMING_AGENT_TOKEN no está configurado')
  }

  let server = await prisma.streamingServer.findFirst({ orderBy: { createdAt: 'asc' } })

  if (!server) {
    server = await prisma.streamingServer.create({
      data: {
        name: 'Servidor Principal',
        type: 'both',
        baseUrl,
        tokenEnc: encrypt(token),
        publicHostname: publicHostnameFromEnv(),
      },
    })
    console.log(`✅ Servidor principal creado: ${server.id} (${server.baseUrl})`)
  } else {
    console.log(`ℹ️ Ya existe un servidor: ${server.id} (${server.baseUrl})`)
  }

  const [radioCount, videoCount] = await Promise.all([
    prisma.radioStream.updateMany({
      where: { serverId: null },
      data: { serverId: server.id },
    }),
    prisma.videoStream.updateMany({
      where: { serverId: null },
      data: { serverId: server.id },
    }),
  ])

  console.log(`✅ RadioStreams asignados al servidor principal: ${radioCount.count}`)
  console.log(`✅ VideoStreams asignados al servidor principal: ${videoCount.count}`)
}

main()
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
