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
const FOOTER = `<p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center">CasterFly — Si no pediste este correo, ignoralo o respondé para dejar de recibir comunicaciones.</p>`

const TEMPLATES = [
  {
    key: 'boleta',
    name: 'Boleta / Cobro',
    description: 'Se envía al generarse una cuota o al confirmarse un pago. Variables: {{nombre}}, {{proyecto}}, {{plan}}, {{monto}}, {{moneda}}, {{fecha}}, {{descripcion}}, {{link}}, {{vence}}, {{aviso}}.',
    subject: '{{proyecto}} — tu cuenta del mes ({{fecha}})',
    htmlBody: `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 4px">${'{{proyecto}}'}</h2>
    <p style="color:#6b7280;margin:0 0 16px">Hola ${'{{nombre}}'} 👋</p>
    <div style="${BOX_STYLE}">
      <p style="margin:0 0 12px;color:#374151">Te compartimos la cuenta del mes. Puedes pagar desde tu panel o transferir y avisarnos.</p>
      <p style="margin:0 0 12px;color:#0891b2;font-weight:600">${'{{aviso}}'}</p>
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
    key: 'bienvenida',
    name: 'Bienvenida / Plan contratado',
    description: 'Se envía al cliente al contratar un plan. El correo indica que el plan queda activo por 24 horas y que debe pagarse antes de la fecha indicada. Variables: {{nombre}}, {{proyecto}}, {{plan}}, {{monto}}, {{moneda}}, {{fecha}}, {{prueba}}, {{link}}, {{sitio}}.',
    subject: '¡Bienvenido a {{proyecto}}, {{nombre}}!',
    htmlBody: `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 4px">${'{{proyecto}}'}</h2>
    <p style="color:#6b7280;margin:0 0 16px">Hola ${'{{nombre}}'} 👋</p>
    <div style="${BOX_STYLE}">
      <p style="margin:0 0 12px;color:#374151">¡Tu plan <strong>${'{{plan}}'}</strong> ya está activo! Te damos la bienvenida y te compartimos los datos de tu contratación.</p>
      <p style="margin:0 0 12px;color:#0891b2;font-weight:600">${'{{prueba}}'}</p>
      <table style="width:100%;font-size:14px">
        <tr><td style="padding:4px 0;color:#6b7280">Plan</td><td style="text-align:right;font-weight:600">${'{{plan}}'}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Fecha de cobro</td><td style="text-align:right">${'{{fecha}}'}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Total</td><td style="text-align:right;font-size:20px;font-weight:700;color:#0891b2">${'{{moneda}}'} ${'{{monto}}'}</td></tr>
      </table>
    </div>
    <p style="color:#374151;margin:0 0 8px">Ingresa a tu panel para efectuar el pago y configurar tu espacio:</p>
    <div style="text-align:center">
      <a href="${'{{link}}'}" style="${BTN_STYLE}">Ir a pagar</a>
    </div>
    <p style="color:#374151;margin:16px 0 8px">Tu sitio ya está online:</p>
    <div style="text-align:center">
      <a href="${'{{sitio}}'}" style="${BTN_STYLE}">Ver mi sitio</a>
    </div>
    ${FOOTER}
  </div>
</div>`,
  },
  {
    key: 'registro-pendiente',
    name: 'Registro recibido / Cuenta pendiente',
    description: 'Se envía al recibir una solicitud de cuenta desde el sitio público. Variables: {{nombre}}, {{proyecto}}.',
    subject: 'Recibimos tu solicitud — {{proyecto}}',
    htmlBody: `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 4px">${'{{proyecto}}'}</h2>
    <p style="color:#6b7280;margin:0 0 16px">Hola ${'{{nombre}}'} 👋</p>
    <div style="${BOX_STYLE}">
      <p style="margin:0 0 12px;color:#374151">Recibimos tus datos para crear tu cuenta de <strong>${'{{proyecto}}'}</strong>.</p>
      <p style="margin:0;color:#374151">Nuestro equipo está configurando tu espacio. Te avisaremos por correo cuando tu cuenta esté activa. No necesitas hacer nada por ahora.</p>
    </div>
    ${FOOTER}
  </div>
</div>`,
  },
  {
    key: 'cuenta-activada',
    name: 'Cuenta activada',
    description: 'Se envía cuando el administrador activa la cuenta. Variables: {{nombre}}, {{proyecto}}, {{link}}.',
    subject: 'Tu cuenta ya está activa — {{proyecto}}',
    htmlBody: `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 4px">${'{{proyecto}}'}</h2>
    <p style="color:#6b7280;margin:0 0 16px">Hola ${'{{nombre}}'} 👋</p>
    <div style="${BOX_STYLE}">
      <p style="margin:0 0 12px;color:#374151">Tu cuenta de <strong>${'{{proyecto}}'}</strong> ya está activa.</p>
      <p style="margin:0;color:#374151">Ingresa con el email y la contraseña que elegiste al registrarte. Desde el panel podrás configurar tu radio y revisar tu plan y pagos.</p>
    </div>
    <div style="text-align:center">
      <a href="${'{{link}}'}" style="${BTN_STYLE}">Ingresar a mi panel</a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0;text-align:center">Si no recuerdas tu contraseña, contacta a soporte.</p>
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
    subject: 'CasterFly — notificación interna',
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
