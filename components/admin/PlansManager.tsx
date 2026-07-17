'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Users, DollarSign, CreditCard } from 'lucide-react'
import { PlanForm } from './PlanForm'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  features: string
  isActive: boolean
  createdAt: Date
  _count: {
    clients: number
    subscriptions: number
  }
}

interface PlansManagerProps {
  plans: Plan[]
}

export function PlansManager({ plans }: PlansManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setShowForm(true)
  }

  const handleDelete = async (planId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este plan?')) return
    
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        window.location.reload()
      } else {
        alert('Error al eliminar el plan')
      }
    } catch (error) {
      alert('Error al eliminar el plan')
    }
  }

  const formatPrice = (price: number, currency: string, interval: string) => {
    const formattedAmount = currency === 'CLP' 
      ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
    
    return `${formattedAmount}/${interval === 'monthly' ? 'mes' : 'año'}`
  }

  const parseFeatures = (features: string) => {
    try {
      return JSON.parse(features)
    } catch {
      return []
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de Planes</h2>
        <Button 
          onClick={() => {
            setEditingPlan(null)
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {showForm && (
        <PlanForm 
          plan={editingPlan}
          onClose={() => {
            setShowForm(false)
            setEditingPlan(null)
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    {plan.name}
                    <Badge 
                      variant={plan.isActive ? "default" : "secondary"}
                      className={plan.isActive ? "bg-green-600" : "bg-gray-600"}
                    >
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </CardTitle>
                  <p className="text-gray-400 text-sm mt-1">
                    {plan.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(plan)}
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(plan.id)}
                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {formatPrice(plan.price, plan.currency, plan.interval)}
                </div>
                <p className="text-gray-400 text-sm">
                  Facturación {plan.interval === 'monthly' ? 'mensual' : 'anual'}
                </p>
              </div>

              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-400">
                  <Users className="h-4 w-4" />
                  {plan._count.clients} clientes
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <DollarSign className="h-4 w-4" />
                  {plan._count.subscriptions} suscripciones
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-300">Características:</p>
                <ul className="space-y-1">
                  {parseFeatures(plan.features).slice(0, 3).map((feature: string, index: number) => (
                    <li key={index} className="text-sm text-gray-400 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      {feature}
                    </li>
                  ))}
                  {parseFeatures(plan.features).length > 3 && (
                    <li className="text-sm text-gray-500">
                      +{parseFeatures(plan.features).length - 3} más...
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No hay planes creados
          </h3>
          <p className="text-gray-400 mb-4">
            Crea tu primer plan para empezar a gestionar suscripciones
          </p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Primer Plan
          </Button>
        </div>
      )}
    </div>
  )
}