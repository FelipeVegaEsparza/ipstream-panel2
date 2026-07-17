'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  DollarSign
} from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  paymentMethod: string
  description: string | null
  receiptUrl: string | null
  dueDate: Date
  paidAt: Date | null
  createdAt: Date
  subscription: {
    plan: {
      name: string
    }
  } | null
}

interface Client {
  id: string
  name: string
  plan: {
    id: string
    name: string
    price: number
    currency: string
    interval: string
  } | null
  subscription: {
    id: string
    status: string
    startDate: Date
    endDate: Date
    plan: {
      name: string
      price: number
      currency: string
      interval: string
    }
    payments?: Array<{
      id: string
      status: string
      dueDate: Date
      paidAt: Date | null
    }>
  } | null
}

interface ClientPaymentsViewProps {
  client: Client
  payments: Payment[]
}

export function ClientPaymentsView({ client, payments }: ClientPaymentsViewProps) {
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'CLP') {
      return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDaysUntilNextPayment = () => {
    if (!client.subscription) return null
    
    // Buscar el próximo pago pendiente más cercano
    const payments = client.subscription.payments || []
    const pendingPayments = payments
      .filter((p: any) => p.status === 'pending')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    
    if (pendingPayments.length > 0) {
      const nextPayment = pendingPayments[0]
      const now = new Date()
      const nextPaymentDate = new Date(nextPayment.dueDate)
      const diffTime = nextPaymentDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }
    
    // Si no hay pagos pendientes, usar la fecha de fin de la suscripción
    const now = new Date()
    const endDate = new Date(client.subscription.endDate)
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  }

  const getNextPaymentDate = () => {
    if (!client.subscription) return null
    
    // Buscar el próximo pago pendiente más cercano
    const payments = client.subscription.payments || []
    const pendingPayments = payments
      .filter((p: any) => p.status === 'pending')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    
    if (pendingPayments.length > 0) {
      return pendingPayments[0].dueDate
    }
    
    // Si no hay pagos pendientes, usar la fecha de fin de la suscripción
    return client.subscription.endDate
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-600', text: 'Pagado', icon: CheckCircle },
      pending: { color: 'bg-yellow-600', text: 'Pendiente', icon: Clock },
      failed: { color: 'bg-red-600', text: 'Fallido', icon: AlertTriangle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const daysUntilNext = getDaysUntilNextPayment()
  const nextPaymentDate = getNextPaymentDate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Mis Pagos
        </h1>
        <p className="text-gray-400">
          Historial de pagos y próximo vencimiento
        </p>
      </div>

      {/* Próximo Pago - Destacado */}
      {client.subscription && nextPaymentDate && (
        <Card className={`border-2 ${
          daysUntilNext !== null && daysUntilNext <= 7 
            ? 'border-orange-500 bg-orange-500/10' 
            : daysUntilNext !== null && daysUntilNext < 0
            ? 'border-red-500 bg-red-500/10'
            : 'border-cyan-500 bg-cyan-500/10'
        }`}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-cyan-400" />
              Próximo Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Plan Actual</p>
                <p className="text-xl font-bold text-white">
                  {client.subscription.plan.name}
                </p>
                <p className="text-sm text-gray-400">
                  {client.subscription.plan.interval === 'monthly' ? 'Mensual' : 'Anual'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Monto</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {formatCurrency(client.subscription.plan.price, client.subscription.plan.currency)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Fecha de Vencimiento</p>
                <p className="text-xl font-bold text-white">
                  {formatDate(nextPaymentDate)}
                </p>
                {daysUntilNext !== null && (
                  <p className={`text-sm font-medium mt-1 ${
                    daysUntilNext < 0 
                      ? 'text-red-400' 
                      : daysUntilNext <= 7 
                      ? 'text-orange-400' 
                      : 'text-green-400'
                  }`}>
                    {daysUntilNext < 0 
                      ? `Vencido hace ${Math.abs(daysUntilNext)} días` 
                      : daysUntilNext === 0
                      ? 'Vence hoy'
                      : `Faltan ${daysUntilNext} días`
                    }
                  </p>
                )}
              </div>
            </div>

            {daysUntilNext !== null && daysUntilNext <= 7 && (
              <div className={`mt-4 p-4 rounded-lg ${
                daysUntilNext < 0 
                  ? 'bg-red-500/20 border border-red-500/30' 
                  : 'bg-orange-500/20 border border-orange-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    daysUntilNext < 0 ? 'text-red-400' : 'text-orange-400'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      daysUntilNext < 0 ? 'text-red-300' : 'text-orange-300'
                    }`}>
                      {daysUntilNext < 0 
                        ? '¡Tu suscripción ha vencido!' 
                        : '¡Tu suscripción está por vencer!'
                      }
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      Contacta al administrador para renovar tu plan y evitar la interrupción del servicio.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sin Plan */}
      {!client.subscription && (
        <Card className="border-2 border-gray-600 bg-gray-800">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              No tienes un plan activo
            </h3>
            <p className="text-gray-400">
              Contacta al administrador para contratar un plan
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historial de Pagos */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-cyan-400" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="p-4 rounded-lg bg-gray-700/50 border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-xl font-bold text-white">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        {getPaymentStatusBadge(payment.status)}
                      </div>

                      {payment.subscription && (
                        <p className="text-sm text-gray-300 mb-1">
                          Plan: {payment.subscription.plan.name}
                        </p>
                      )}

                      {payment.description && (
                        <p className="text-sm text-gray-400 mb-2">
                          {payment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Vencimiento: {formatDate(payment.dueDate)}
                        </div>
                        {payment.paidAt && (
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Pagado: {formatDate(payment.paidAt)}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {payment.paymentMethod === 'bank_transfer' && 'Transferencia'}
                          {payment.paymentMethod === 'credit_card' && 'Tarjeta'}
                          {payment.paymentMethod === 'cash' && 'Efectivo'}
                          {payment.paymentMethod === 'manual' && 'Manual'}
                          {payment.paymentMethod === 'other' && 'Otro'}
                          {payment.paymentMethod === 'pending' && 'Pendiente'}
                        </div>
                      </div>
                    </div>

                    {payment.receiptUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(payment.receiptUrl!, '_blank')}
                        className="border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Comprobante
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No hay pagos registrados
              </h3>
              <p className="text-gray-400">
                Los pagos aparecerán aquí cuando se registren
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
