#!/usr/bin/env node
// =====================================================
// Seed de usuarios de prueba para los tests de carga k6
// =====================================================
// Crea N usuarios CLIENT (con su Client + BasicData + catálogo mínimo) y
// escribe `loadtest/users.json` con las credenciales que consumen los
// escenarios de k6.
//
// Cada usuario es una cuenta distinta porque el login tiene rate-limit en
// memoria (10 intentos / 15 min por email). Nunca reutilices una sola cuenta
// para simular N usuarios.
//
// Uso:
//   K6_USERS=50 node loadtest/seed-users.js
//   K6_USERS=50 K6_PASSWORD='MiPass123!' node loadtest/seed-users.js
//   node loadtest/seed-users.js --cleanup
//
// Variables de entorno:
//   K6_USERS     Cantidad de usuarios a crear (default 50).
//   K6_PASSWORD  Contraseña compartida por todos (default LoadTest123!).
//   K6_EMAIL_DOMAIN  Dominio del email (default example.com).

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const COUNT = parseInt(process.env.K6_USERS || '50', 10)
const PASSWORD = process.env.K6_PASSWORD || 'LoadTest123!'
const EMAIL_DOMAIN = process.env.K6_EMAIL_DOMAIN || 'example.com'
const USERS_FILE = path.join(__dirname, 'users.json')

const emailOf = (i) => `loadtest+${i}@${EMAIL_DOMAIN}`

async function cleanup() {
  const victims = await prisma.user.findMany({
    where: { email: { startsWith: 'loadtest+' } },
    select: { id: true, email: true },
  })

  if (victims.length === 0) {
    console.log('No hay usuarios de prueba que borrar.')
  } else {
    // Client.userId tiene onDelete: Cascade, así que borrar el User limpia
    // su Client y todas las relaciones dependientes.
    await prisma.user.deleteMany({ where: { id: { in: victims.map((v) => v.id) } } })
    console.log(`Borrados ${victims.length} usuarios de prueba (y sus clientes).`)
  }

  if (fs.existsSync(USERS_FILE)) {
    fs.unlinkSync(USERS_FILE)
    console.log(`Eliminado ${USERS_FILE}`)
  }
}

async function seed() {
  console.log(`Sembrando ${COUNT} usuarios de prueba (password: ${PASSWORD})...`)

  // bcrypt cost 12 es lento (~250ms); hashear una vez y reutilizar el hash.
  const hash = await bcrypt.hash(PASSWORD, 12)

  const out = []

  for (let i = 1; i <= COUNT; i++) {
    const email = emailOf(i)
    const name = `Load Test ${i}`

    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hash, role: 'CLIENT', name },
      create: { email, password: hash, role: 'CLIENT', name },
      select: { id: true },
    })

    const client = await prisma.client.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, name },
      select: { id: true },
    })

    await prisma.basicData.upsert({
      where: { clientId: client.id },
      update: {},
      create: {
        clientId: client.id,
        projectName: name,
        projectDescription: 'Cliente sintético para pruebas de carga con k6',
      },
    })

    // Catálogo mínimo para que los listados tengan datos reales que recorrer.
    const newsCount = await prisma.news.count({ where: { clientId: client.id } })
    if (newsCount === 0) {
      await prisma.news.createMany({
        data: Array.from({ length: 5 }, (_, k) => ({
          clientId: client.id,
          name: `Noticia ${k + 1}`,
          slug: `noticia-${k + 1}`,
          shortText: `Resumen de la noticia ${k + 1}`,
          longText: `Contenido completo de la noticia ${k + 1} para las pruebas de carga.`,
        })),
      })
    }

    const programCount = await prisma.program.count({ where: { clientId: client.id } })
    if (programCount === 0) {
      await prisma.program.createMany({
        data: [
          { clientId: client.id, name: 'Mañana', description: 'Programa matinal', startTime: '08:00', endTime: '12:00', weekDays: '["monday","tuesday","wednesday","thursday","friday"]' },
          { clientId: client.id, name: 'Tarde', description: 'Programa vespertino', startTime: '12:00', endTime: '18:00', weekDays: '["monday","tuesday","wednesday","thursday","friday"]' },
        ],
      })
    }

    out.push({ label: name, email, password: PASSWORD, clientId: client.id })

    if (i % 10 === 0 || i === COUNT) {
      process.stdout.write(`  ${i}/${COUNT}\r`)
    }
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(out, null, 2))
  console.log(`\nListo. Credenciales escritas en ${USERS_FILE}`)
  console.log(`Usuario ejemplo: ${out[0].email} / ${PASSWORD} (clientId ${out[0].clientId})`)
  console.log('\nEjecuta los tests, por ejemplo:')
  console.log('  BASE_URL=https://panel.tudominio.com k6 run loadtest/smoke.js')
  console.log('  BASE_URL=https://panel.tudominio.com k6 run loadtest/dashboard.js')
}

async function main() {
  try {
    if (process.argv.includes('--cleanup')) {
      await cleanup()
    } else {
      await seed()
    }
  } catch (error) {
    console.error('Error:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
