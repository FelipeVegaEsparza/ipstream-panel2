'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Receipt,
  X,
  RefreshCw,
  UserMinus,
  CalendarClock,
  MessageCircle,
  MoreVertical,
  Pencil,
  History,
  FileText,
} from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '@/lib/billing-format'
import {
  getClientPaymentStatus,
  STATUS_BADGES,
  type ClientPayment,
  type ClientSubscriptionLite,
} from '@/lib/payment-status'
import { RegistrarPagoModal } from './RegistrarPagoModal'
import { EditarFechaInicioModal } from './EditarFechaInicioModal'
import { buildWhatsAppUrl, defaultAccountMessage, normalizeChileanPhone } from '@/lib/whatsapp'

export interface ClienteRowData {
  id: string
  name: string
  email: string
  phone: string | null
  plan: {
    id: string
    name: string
    price: number
    currency: string
    interval: string
  } | null
  subscription: (ClientSubscriptionLite & { id: string }) | null
  payments: ClientPayment[]
  disabledMenuCount?: number
}

export interface ClienteRowProps {
  client: ClienteRowData
  onAsignarPlan: (client: ClienteRowData) => void
  onQuitarPlan: (client: ClienteRowData) => void
  onRenovar: (client: ClienteRowData) => void
  onCancelar: (client: ClienteRowData) => void
  onMarkPaymentPaid: (paymentId: string) => Promise<void>
}

export function ClienteRow({
  client,
  onAsignarPlan,
  onQuitarPlan,
  onRenovar,
  onCancelar,
  onMarkPaymentPaid,
}: ClienteRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [showPago, setShowPago] = useState(false)
  const [showEditarFecha, setShowEditarFecha] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const status = getClientPaymentStatus(
    client.plan !== null,
    client.subscription,
    client.payments
  )
  const badge = STATUS_BADGES[status.status]

  const sortedPayments = [...client.payments].sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  )

  const BadgeIcon =
    badge.icon === 'check'
      ? CheckCircle2
      : badge.icon === 'clock'
      ? Clock
      : badge.icon === 'alert'
      ? AlertTriangle
      : null

  const hasPhone = !!normalizeChileanPhone(client.phone)
  const subscriptionActive = client.subscription?.status === 'active'
  const subscriptionExpired =
    client.subscription?.status === 'expired' || client.subscription?.status === 'cancelled'
  const hasPlan = !!client.plan

  return (
    <>
      <tr className="border-b border-gray-700 hover:bg-gray-800/40">
        <td className="px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white font-medium">{client.name}</p>
              {(client.disabledMenuCount ?? 0) > 0 && (
                <a
                  href={`/admin/users/${client.id}/menu`}
                  title="Menú personalizado — click para editar"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30"
                >
                  ⚙ {client.disabledMenuCount} ocultos
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400">{client.email}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          {client.plan ? (
            <div>
              <p className="text-white text-sm font-medium">{client.plan.name}</p>
              <p className="text-xs text-gray-400">
                {formatCurrency(client.plan.price, client.plan.currency)}/
                {client.plan.interval === 'monthly' ? 'mes' : 'año'}
              </p>
            </div>
          ) : (
            <span className="text-sm text-gray-500">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <Badge className={`${badge.color} text-white flex items-center gap-1 w-fit`}>
            {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
            {badge.text}
          </Badge>
          {status.daysUntilDue !== null && status.status !== 'no_plan' && status.status !== 'no_subscription' && (
            <p className="text-xs text-gray-400 mt-1">
              {status.daysUntilDue < 0
                ? `Hace ${Math.abs(status.daysUntilDue)} días`
                : status.daysUntilDue === 0
                ? 'Vence hoy'
                : `En ${status.daysUntilDue} días`}
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          {status.nextPayment ? (
            <p className="text-sm text-white">{formatDate(status.nextPayment.dueDate)}</p>
          ) : client.subscription ? (
            <p className="text-sm text-gray-400">{formatDate(client.subscription.endDate)}</p>
          ) : (
            <span className="text-sm text-gray-500">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {status.lastPayment ? (
            <p className="text-sm text-white">
              {formatDate(status.lastPayment.paidAt ?? status.lastPayment.createdAt)}
            </p>
          ) : (
            <span className="text-sm text-gray-500">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {hasPlan ? (
              <>
                {hasPhone && (() => {
                  const whatsappUrl = buildWhatsAppUrl(
                    client.phone,
                    defaultAccountMessage(client.name)
                  )
                  return (
                    <a
                      href={whatsappUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir conversación de WhatsApp"
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-medium bg-[#25D366] hover:bg-[#1da851] text-white transition-colors"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      WhatsApp
                    </a>
                  )
                })()}
                <Button
                  size="sm"
                  onClick={() => setShowPago(true)}
                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Registrar pago
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => onAsignarPlan(client)}
                className="bg-cyan-600 hover:bg-cyan-700 h-8 text-xs"
              >
                Asignar plan
              </Button>
            )}

            {hasPlan && client.subscription && (
              <div className="relative" ref={menuRef}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                  title="Más acciones"
                  aria-label="Más acciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-52 rounded-lg border border-gray-700 bg-gray-800 shadow-xl z-20 py-1 text-sm">
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setShowEditarFecha(true)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white flex items-center gap-2"
                    >
                      <CalendarClock className="h-4 w-4 text-cyan-400" />
                      Editar fecha de inicio
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onAsignarPlan(client)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white flex items-center gap-2"
                    >
                      <Pencil className="h-4 w-4 text-gray-400" />
                      Cambiar plan
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        window.open(
                          `/api/admin/clients/${client.id}/account-pdf`,
                          '_blank'
                        )
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4 text-cyan-400" />
                      Generar boleta de pago
                    </button>
                    {subscriptionActive && (
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          onCancelar(client)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white flex items-center gap-2"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                        Cancelar suscripción
                      </button>
                    )}
                    {subscriptionExpired && (
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          onRenovar(client)
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4 text-blue-400" />
                        Renovar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        setExpanded((v) => !v)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white flex items-center gap-2"
                    >
                      <History className="h-4 w-4 text-gray-400" />
                      {expanded ? 'Ocultar historial' : `Ver historial (${client.payments.length})`}
                    </button>
                    <div className="my-1 border-t border-gray-700" />
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onQuitarPlan(client)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-600/20 text-red-400 flex items-center gap-2"
                    >
                      <UserMinus className="h-4 w-4" />
                      Quitar plan
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-900/40">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-cyan-400" />
                Historial de pagos
              </h4>
              {sortedPayments.length === 0 ? (
                <p className="text-sm text-gray-400">No hay pagos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {sortedPayments.map((p) => {
                    const dueDate = new Date(p.dueDate)
                    const isOverdue = p.status === 'pending' && dueDate < new Date()
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-800/60 border border-gray-700"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium">
                              {formatCurrency(p.amount, p.currency)}
                            </span>
                            <Badge
                              className={`${
                                p.status === 'completed'
                                  ? 'bg-green-600'
                                  : p.status === 'failed'
                                  ? 'bg-red-600'
                                  : p.status === 'refunded'
                                  ? 'bg-gray-600'
                                  : isOverdue
                                  ? 'bg-red-600'
                                  : 'bg-yellow-600'
                              } text-white`}
                            >
                              {p.status === 'completed'
                                ? 'Pagado'
                                : p.status === 'failed'
                                ? 'Fallido'
                                : p.status === 'refunded'
                                ? 'Reembolsado'
                                : isOverdue
                                ? 'Vencido'
                                : 'Pendiente'}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Vence: {formatDate(p.dueDate)}
                            </span>
                            {p.paidAt && (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Pagado: {formatDate(p.paidAt)}
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{p.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.receiptUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(p.receiptUrl!, '_blank')}
                              className="border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white h-8 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Comprobante
                            </Button>
                          )}
                          {p.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={async () => {
                                setMarkingId(p.id)
                                await onMarkPaymentPaid(p.id)
                                setMarkingId(null)
                              }}
                              disabled={markingId === p.id}
                              className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                            >
                              {markingId === p.id ? '...' : 'Marcar pagado'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      {showPago && client.plan && client.subscription && (
        <RegistrarPagoModal
          open={showPago}
          onClose={() => setShowPago(false)}
          onSuccess={() => {
            setShowPago(false)
            window.location.reload()
          }}
          subscriptionId={client.subscription.id}
          clientName={client.name}
          planName={client.plan.name}
          amount={client.plan.price}
          currency={client.plan.currency}
        />
      )}

      {showEditarFecha && client.subscription && (
        <EditarFechaInicioModal
          open={showEditarFecha}
          onClose={() => setShowEditarFecha(false)}
          onSuccess={() => {
            setShowEditarFecha(false)
            window.location.reload()
          }}
          subscriptionId={client.subscription.id}
          clientName={client.name}
          currentStartDate={client.subscription.startDate}
        />
      )}
    </>
  )
}
