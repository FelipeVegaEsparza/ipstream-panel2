import { PromotionForm } from '@/components/dashboard/PromotionForm'

export default function NewPromotionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Nueva Promoción
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Crea una nueva promoción u oferta especial
        </p>
      </div>

      <div className="card max-w-2xl">
        <PromotionForm />
      </div>
    </div>
  )
}