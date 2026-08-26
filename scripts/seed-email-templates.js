#!/usr/bin/env node
// =====================================================
// Seed de plantillas de correo (Resend).
// Crea o actualiza las plantillas iniciales (boleta, soporte, aviso).
// No toca plantillas editadas por el admin (solo si no existen o se pide --force).
//
// Uso dentro del contenedor app:
//   docker exec ipstream-app node scripts/seed-email-templates.js [--force]
// =====================================================

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const BOX_STYLE = 'background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:16px 0'
const BTN_STYLE = 'display:inline-block;background:#0891b2;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600'
const FOOTER = `<p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center">IPStream — Si no pediste este correo, ignoralo o respondé para dejar de recibir comunicaciones.</p>`

const TEMPLATES = [
  {
    key: 'boleta',
    name: 'Boleta / Cobro',
    description: 'Se envía al generarse una cuota o al confirmarse un pago. Variables: {{nombre}}, {{proyecto}}, {{plan}}, {{monto}}, {{moneda}}, {{fecha}}, {{descripcion}}, {{link}}, {{vence}}.',
    subject: '{{proyecto}} — tu cuenta del mes ({{fecha}})',
    htmlBody: `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 4px">${'{{proyecto}}'}</h2>
    <p style="color:#6b7280;margin:0 0 16px">Hola ${'{{nombre}}'} 👋</p>
    <div style="${BOX_STYLE}">
      <p style="margin:0 0 12px;color:#374151">Te compartimos la cuenta del mes. Podés pagar desde tu panel o transferir y avisarnos.</p>
      <table style="width:100%;font-size:14px">
        <tr><td style="padding:4px 0;color:#6b7280">Plan</td><td style="text-align:right;font-weight:600">${'{{plan}}'}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Periodo</td><td style="text-align:right">${'{{descripcion}}'}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Vence</td><td style="text-align:right">${'{{vence}}'}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Total</td><td style="text-align:right;font-size:20px;font-weight:700;color:#0891b2">${'{{moneda}}'} ${'{{monto}}'}</td></tr>
      </table>
    </div>
    <div style="text-align:center">
      <a href="${'{{link}}'}" style="${BTN_STYLE}">Ver y pagar desde mi panel</a>
    </div>
    ${FOOTER}
  </div>
</div>`,
  },
  {
    key: 'soporte',
    name: 'Soporte / Ticket',
    description: 'Se envía al responder un ticket de soporte. Variables: {{nombre}}, {{proyecto}}, {{asunto}}, {{respuesta}}, {{link}}.',
    subject: 'Soporte — {{proyecto}}: {{asunto}}',
    htmlBody: `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 4px">${'{{proyecto}}'}</h2>
    <p style="color:#6b7280;margin:0 0 16px">Hola ${'{{nombre}}'} 👋</p>
    <p style="margin:0 0 8px">Tu ticket <strong>${'{{asunto}}'}</strong> recibió una respuesta del equipo de soporte:</p>
    <div style="${BOX_STYLE}">
      <p style="margin:0;white-space:pre-wrap">${'{{respuesta}}'}</p>
    </div>
    <div style="text-align:center">
      <a href="${'{{link}}'}" style="${BTN_STYLE}">Ver el ticket</a>
    </div>
    ${FOOTER}
  </div>
</div>`,
  },
  {
    key: 'aviso',
    name: 'Aviso general',
    description: 'Comunicaciones generales desde el admin. Variables: {{nombre}}, {{proyecto}}, {{mensaje}}, {{link}}.',
    subject: 'Aviso — {{proyecto}}',
    htmlBody: `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 4px">${'{{proyecto}}'}</h2>
    <p style="color:#6b7280;margin:0 0 16px">Hola ${'{{nombre}}'} 👋</p>
    <div style="${BOX_STYLE}">
      <p style="margin:0;white-space:pre-wrap">${'{{mensaje}}'}</p>
    </div>
    ${'{{link}}' ? `<div style="text-align:center"><a href="${'{{link}}'}" style="${BTN_STYLE}">Más información</a></div>` : ''}
    ${FOOTER}
  </div>
</div>`,
  },
  {
    key: 'aviso-admin',
    name: 'Notificación interna (admin)',
    description: 'Notificaciones internas al administrador (nuevos registros, etc.). Cuerpo fijo en código.',
    subject: 'IPStream — notificación interna',
    htmlBody: '<p>Notificación interna del panel.</p>',
  },
]

async function main() {
  const force = process.argv.includes('--force')
  for (const t of TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key: t.key } })
    if (!existing) {
      await prisma.emailTemplate.create({ data: t })
      console.log(`✅ Plantilla creada: ${t.key}`)
    } else if (force) {
      await prisma.emailTemplate.update({ where: { key: t.key }, data: t })
      console.log(`🔄 Plantilla actualizada: ${t.key}`)
    } else {
      console.log(`ℹ️ Plantilla ya existe (sin cambios): ${t.key}`)
    }
  }
}

main()
  .catch((err) => { console.error('❌ Error:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
