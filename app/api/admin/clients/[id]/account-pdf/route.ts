import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jsPDF } from 'jspdf'
import { PDF_COLORS, PDF_LAYOUT, PDF_FONTS, COMPANY } from '@/lib/pdf-styles'
import { formatDate, formatCurrency } from '@/lib/billing-format'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getMonthLabelEs(date: Date): string {
  return `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function setColor(rgb: [number, number, number]): [number, number, number] {
  return rgb
}

function safeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    || 'cliente'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const message = request.nextUrl.searchParams.get('message') || ''

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        plan: true,
        subscription: {
          include: {
            plan: true,
            payments: { orderBy: { dueDate: 'asc' } },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const payments = client.subscription?.payments ?? []
    const plan = client.plan ?? client.subscription?.plan ?? null

    const totalFacturado = payments
      .filter((p) => p.status !== 'refunded')
      .reduce((acc, p) => acc + p.amount, 0)
    const totalPagado = payments
      .filter((p) => p.status === 'completed')
      .reduce((acc, p) => acc + p.amount, 0)
    const saldoPendiente = totalFacturado - totalPagado

    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
    })

    const nextPayment = payments
      .filter((p) => p.status === 'pending')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
    const chargeDate = nextPayment ? new Date(nextPayment.dueDate) : new Date()
    const monthLabel = getMonthLabelEs(chargeDate)
    const isOverdue = nextPayment ? new Date(nextPayment.dueDate) < new Date() : false
    const amount = nextPayment ? nextPayment.amount : (plan?.price ?? 0)
    const currency = nextPayment?.currency ?? plan?.currency ?? 'CLP'
    const amountText = formatCurrency(amount, currency)
    const statusLabel = !client.subscription
      ? 'Sin suscripción'
      : client.subscription.status === 'active'
      ? 'Activa'
      : client.subscription.status === 'cancelled'
      ? 'Cancelada'
      : client.subscription.status === 'expired'
      ? 'Vencida'
      : 'Pendiente'

    let daysOverdue = 0
    let daysUntil = 0
    if (isOverdue && nextPayment) {
      daysOverdue = Math.ceil(
        (Date.now() - new Date(nextPayment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    } else if (nextPayment) {
      daysUntil = Math.ceil(
        (new Date(nextPayment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    }

    const COL_CYAN: [number, number, number] = [6, 182, 212]
    const COL_CYAN_DARK: [number, number, number] = [8, 145, 178]
    const COL_CYAN_LIGHT: [number, number, number] = [236, 254, 255]
    const COL_INK: [number, number, number] = [15, 23, 42]
    const COL_INK_SOFT: [number, number, number] = [71, 85, 105]
    const COL_INK_MUTED: [number, number, number] = [148, 163, 184]
    const COL_LINE: [number, number, number] = [226, 232, 240]
    const COL_WHITE: [number, number, number] = [255, 255, 255]

    // ── Banda superior decorativa (cyan del logo) ──────────────────
    doc.setFillColor(...COL_CYAN)
    doc.rect(0, 0, PDF_LAYOUT.pageWidth, 8, 'F')

    // ── Logo + nombre de empresa ───────────────────────────────────
    let y = 36
    const logoBoxW = 178
    const logoBoxH = 46
    const logoBoxX = PDF_LAYOUT.margin - 8
    const logoBoxY = y - 6

    doc.setFillColor(...COL_CYAN_LIGHT)
    doc.roundedRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 8, 8, 'F')

    doc.setFillColor(...COL_CYAN)
    doc.roundedRect(logoBoxX, logoBoxY, 4, logoBoxH, 2, 2, 'F')

    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-ipstream.png')
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath).toString('base64')
        doc.addImage(`data:image/png;base64,${logoData}`, 'PNG', PDF_LAYOUT.margin + 6, y, 130, 33)
      }
    } catch (e) {
      console.warn('No se pudo cargar el logo:', e)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COL_INK_MUTED)
    doc.text('contacto@ipstream.cl', PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin, y + 12, { align: 'right' })
    doc.text('Panel de Clientes', PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin, y + 24, { align: 'right' })

    y += 50

    // ── Acento cyan vertical + título grande ───────────────────────
    doc.setFillColor(...COL_CYAN)
    doc.rect(PDF_LAYOUT.margin, y, 4, 56, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COL_CYAN)
    doc.text('CUENTA DEL MES', PDF_LAYOUT.margin + 14, y + 12)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.setTextColor(...COL_INK)
    doc.text(monthLabel, PDF_LAYOUT.margin + 14, y + 36)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COL_INK_MUTED)
    doc.text(
      `Emitida el ${formatDate(new Date())}`,
      PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin,
      y + 24,
      { align: 'right' }
    )

    y += 78

    // ── Tarjeta de 2 columnas: Cliente | Plan ──────────────────────
    const cardX = PDF_LAYOUT.margin
    const cardW = PDF_LAYOUT.contentWidth
    const cardH = 92
    const gap = 14
    const colW = (cardW - gap) / 2

    doc.setFillColor(...COL_CYAN_LIGHT)
    doc.roundedRect(cardX, y, cardW, cardH, 8, 8, 'F')

    // Columna izquierda: Cliente
    doc.setFillColor(...COL_CYAN)
    doc.roundedRect(cardX, y, 3, cardH, 1.5, 1.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COL_CYAN_DARK)
    doc.text('CLIENTE', cardX + 14, y + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...COL_INK)
    doc.text(client.name, cardX + 14, y + 34, { maxWidth: colW - 28 })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COL_INK_SOFT)
    doc.text(client.user.email, cardX + 14, y + 52, { maxWidth: colW - 28 })
    if (client.phone) {
      doc.text(client.phone, cardX + 14, y + 66)
    }

    // Separador vertical cyan
    doc.setDrawColor(...COL_CYAN)
    doc.setLineWidth(0.5)
    doc.line(cardX + colW + gap / 2, y + 14, cardX + colW + gap / 2, y + cardH - 14)

    // Columna derecha: Plan
    const rightX = cardX + colW + gap

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COL_CYAN_DARK)
    doc.text('PLAN', rightX, y + 16)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...COL_INK)
    if (plan) {
      doc.text(plan.name, rightX, y + 34, { maxWidth: colW - 16 })
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COL_INK_SOFT)
    if (plan) {
      doc.text(
        `${formatCurrency(plan.price, plan.currency)} / ${plan.interval === 'monthly' ? 'mes' : 'año'}`,
        rightX,
        y + 52
      )
    }
    if (client.subscription) {
      doc.text(`Alta: ${formatDate(client.subscription.startDate)}`, rightX, y + 66)
    }

    y += cardH + 16

    // ── Caja destacada: Mes a cobrar (con color del logo) ──────────
    const chargeH = 130
    doc.setFillColor(...COL_CYAN)
    doc.roundedRect(cardX, y, cardW, chargeH, 8, 8, 'F')

    // Acento diagonal decorativo (esquina superior derecha)
    doc.setFillColor(8, 145, 178)
    doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.45 }))
    doc.triangle(
      cardX + cardW, y,
      cardX + cardW - 80, y,
      cardX + cardW, y + 80,
      'F'
    )
    doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 1 }))

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COL_CYAN_LIGHT)
    doc.text('MES A COBRAR', cardX + 16, y + 18)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(30)
    doc.setTextColor(...COL_WHITE)
    doc.text(monthLabel, cardX + 16, y + 50)

    // Línea separadora sutil
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.4)
    doc.line(cardX + 16, y + 60, cardX + 200, y + 60)

    // Detalles a la izquierda
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COL_CYAN_LIGHT)
    doc.text('VENCIMIENTO', cardX + 16, y + 78)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COL_WHITE)
    doc.text(
      nextPayment ? formatDate(nextPayment.dueDate) : 'Sin pagos pendientes',
      cardX + 16,
      y + 94
    )

    // Badge de estado
    if (isOverdue) {
      const overdueText = daysOverdue === 1 ? 'Vencido hace 1 día' : `Vencido hace ${daysOverdue} días`
      const overdueWidth = Math.max(140, doc.getTextWidth(overdueText) + 24)
      doc.setFillColor(220, 38, 38)
      doc.roundedRect(cardX + 16, y + 102, overdueWidth, 20, 4, 4, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...COL_WHITE)
      doc.text(overdueText, cardX + 16 + overdueWidth / 2, y + 116, { align: 'center' })
    } else if (nextPayment && daysUntil <= 7 && daysUntil >= 0) {
      const soonText = daysUntil === 0 ? 'Vence hoy' : `Vence en ${daysUntil} días`
      const soonWidth = Math.max(120, doc.getTextWidth(soonText) + 24)
      doc.setFillColor(245, 158, 11)
      doc.roundedRect(cardX + 16, y + 102, soonWidth, 20, 4, 4, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...COL_WHITE)
      doc.text(soonText, cardX + 16 + soonWidth / 2, y + 116, { align: 'center' })
    }

    // Monto a la derecha
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COL_CYAN_LIGHT)
    doc.text('MONTO', cardX + cardW - 16, y + 78, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...COL_WHITE)
    doc.text(amountText, cardX + cardW - 16, y + 102, { align: 'right' })

    y += chargeH + 16

    // ── Estado de suscripción (badge) ─────────────────────────────
    const statusColor = statusLabel === 'Activa'
      ? [16, 185, 129]
      : statusLabel === 'Vencida'
      ? [220, 38, 38]
      : statusLabel === 'Cancelada'
      ? [100, 116, 139]
      : [245, 158, 11]

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COL_INK_SOFT)
    doc.text('Estado de la suscripción:', cardX, y)

    const labelText = `  ${statusLabel.toUpperCase()}  `
    const labelWidth = doc.getTextWidth(labelText) + 6
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    doc.roundedRect(cardX + 130, y - 11, labelWidth, 16, 4, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...COL_WHITE)
    doc.text(statusLabel.toUpperCase(), cardX + 130 + labelWidth / 2, y, { align: 'center' })

    y += 28

    // ── Sección "Tu plan incluye" + "Contacto" (2 columnas) ───────
    if (y < PDF_LAYOUT.pageHeight - 160) {
      const featuresRaw = plan?.features ? (() => {
        try {
          const parsed = JSON.parse(plan.features)
          return Array.isArray(parsed) ? parsed.filter((f) => typeof f === 'string' && f.trim()) : []
        } catch {
          return []
        }
      })() : []
      const contactInfo = [
        { label: 'Email', value: 'contacto@ipstream.cl' },
        { label: 'Web', value: 'www.ipstream.cl' },
      ]

      const blockH = 110
      const blockGap = 14
      const blockColW = (cardW - blockGap) / 2

      // Tarjeta izquierda: Tu plan incluye
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(...COL_LINE)
      doc.setLineWidth(0.5)
      doc.roundedRect(cardX, y, blockColW, blockH, 6, 6, 'FD')

      doc.setFillColor(...COL_CYAN)
      doc.roundedRect(cardX, y, 3, blockH, 1.5, 1.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...COL_CYAN_DARK)
      doc.text('TU PLAN INCLUYE', cardX + 14, y + 16)

      let featY = y + 32
      if (featuresRaw.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(...COL_INK_MUTED)
        doc.text('Plan personalizado', cardX + 14, featY)
      } else {
        const maxFeatures = Math.min(featuresRaw.length, 5)
        for (let i = 0; i < maxFeatures; i++) {
          doc.setFillColor(...COL_CYAN)
          doc.circle(cardX + 17, featY - 3, 1.8, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(...COL_INK)
          const lines = doc.splitTextToSize(featuresRaw[i], blockColW - 30)
          doc.text(lines, cardX + 24, featY)
          featY += lines.length * 12 + 4
        }
      }

      // Tarjeta derecha: Contacto
      const rightCardX = cardX + blockColW + blockGap
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(...COL_LINE)
      doc.setLineWidth(0.5)
      doc.roundedRect(rightCardX, y, blockColW, blockH, 6, 6, 'FD')

      doc.setFillColor(...COL_CYAN)
      doc.roundedRect(rightCardX, y, 3, blockH, 1.5, 1.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...COL_CYAN_DARK)
      doc.text('CONTACTO', rightCardX + 14, y + 16)

      let contY = y + 34
      contactInfo.forEach((c) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...COL_INK_MUTED)
        doc.text(c.label, rightCardX + 14, contY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...COL_INK)
        doc.text(c.value, rightCardX + 14, contY + 12)
        contY += 32
      })

      y += blockH
    }

    // ── Mensaje opcional ──────────────────────────────────────────
    if (message.trim()) {
      if (y > PDF_LAYOUT.pageHeight - 120) {
        doc.addPage()
        y = PDF_LAYOUT.margin
      }

      // Acento cyan
      doc.setFillColor(...COL_CYAN)
      doc.rect(cardX, y, 3, 60, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...COL_CYAN_DARK)
      doc.text('MENSAJE', cardX + 14, y + 10)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.setTextColor(...COL_INK)
      const lines = doc.splitTextToSize(message.trim(), cardW - 30)
      doc.text(lines, cardX + 14, y + 28)
      y += 28 + lines.length * 13 + 8
    }

    // ── Footer con acento cyan ────────────────────────────────────
    const footerY = PDF_LAYOUT.pageHeight - 24

    // Banda cyan sutil
    doc.setFillColor(...COL_CYAN)
    doc.rect(0, footerY - 2, PDF_LAYOUT.pageWidth, 2, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COL_INK_MUTED)
    doc.text(
      COMPANY.name,
      PDF_LAYOUT.margin,
      footerY + 8
    )
    doc.text(
      COMPANY.email,
      PDF_LAYOUT.pageWidth / 2,
      footerY + 8,
      { align: 'center' }
    )
    doc.text(
      `Generado el ${formatDate(new Date(), true)}`,
      PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin,
      footerY + 8,
      { align: 'right' }
    )

    const pdfBuffer = doc.output('arraybuffer')
    const fileName = `cuenta-${safeFileName(client.name)}-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error al generar PDF de cuenta:', error)
    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 }
    )
  }
}
