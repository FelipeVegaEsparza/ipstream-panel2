'use client'

import Link from 'next/link'
import { CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface PaymentStatusCardProps {
  nextPaymentDate: Date | null
  planName: string | null
  planPrice: number | null
  status: 'paid' | 'due-soon' | 'overdue' | 'no-plan'
}

export function PaymentStatusCard({ nextPaymentDate, planName, planPrice, status }: PaymentStatusCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return {
          title: 'Al Día',
          icon: CheckCircleIcon,
          gradient: 'from-green-500/20 to-emerald-600/20',
          border: 'border-green-500/30',
          textColor: 'text-green-400',
          iconColor: 'text-green-400',
          bgIcon: 'bg-green-500/20'
        }
      case 'due-soon':
        return {
          title: 'Próximo a Vencer',
          icon: ExclamationTriangleIcon,
          gradient: 'from-yellow-500/20 to-orange-600/20',
          border: 'border-yellow-500/30',
          textColor: 'text-yellow-400',
          iconColor: 'text-yellow-400',
          bgIcon: 'bg-yellow-500/20'
        }
      case 'overdue':
        return {
          title: 'Pago Vencido',
          icon: XCircleIcon,
          gradient: 'from-red-500/20 to-red-600/20',
          border: 'border-red-500/30',
          textColor: 'text-red-400',
          iconColor: 'text-red-400',
          bgIcon: 'bg-red-500/20'
        }
      default:
        return {
          title: 'Sin Plan Activo',
          icon: CreditCardIcon,
          gradient: 'from-gray-500/20 to-gray-600/20',
          border: 'border-gray-500/30',
          textColor: 'text-gray-400',
          iconColor: 'text-gray-400',
          bgIcon: 'bg-gray-500/20'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const getDaysRemaining = () => {
    if (!nextPaymentDate) return null
    const now = new Date()
    const diff = nextPaymentDate.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const daysRemaining = getDaysRemaining()

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`card bg-gradient-to-br ${config.gradient} ${config.border} relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`${config.bgIcon} p-3 rounded-xl`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Estado de Pago</h3>
            <p className={`text-sm font-medium ${config.textColor}`}>{config.title}</p>
          </div>
        </div>
      </div>

      {status === 'no-plan' ? (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            No tienes un plan activo. Contacta al administrador para activar tu suscripción.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Plan Info */}
          <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
            <span className="text-sm text-gray-300">Plan Actual</span>
            <span className="text-sm font-semibold text-white">{planName}</span>
          </div>

          {/* Next Payment Date */}
          {nextPaymentDate && (
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-300">Próximo Pago</span>
              <span className="text-sm font-semibold text-white">
                {formatDate(nextPaymentDate)}
              </span>
            </div>
          )}

          {/* Amount */}
          {planPrice && (
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <span className="text-sm text-gray-300">Monto</span>
              <span className="text-sm font-semibold text-white">
                {formatCurrency(planPrice)}
              </span>
            </div>
          )}

          {/* Days Remaining */}
          {daysRemaining !== null && (
            <div className={`p-4 rounded-lg ${config.bgIcon} ${config.border} border`}>
              <div className="text-center">
                <div className={`text-3xl font-bold ${config.textColor} mb-1`}>
                  {daysRemaining > 0 ? daysRemaining : Math.abs(daysRemaining)}
                </div>
                <div className="text-sm text-gray-300">
                  {daysRemaining > 0 
                    ? `día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}`
                    : daysRemaining === 0
                    ? 'Vence hoy'
                    : `día${daysRemaining !== -1 ? 's' : ''} de retraso`
                  }
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Link
            href="/dashboard/payments"
            className="block w-full text-center py-3 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors"
          >
            Ver Historial de Pagos
          </Link>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full bg-white/5 transform rotate-45"></div>
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-20 h-20 rounded-full bg-white/5"></div>
    </div>
  )
}
