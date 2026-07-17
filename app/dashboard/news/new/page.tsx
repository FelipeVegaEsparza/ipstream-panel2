import { NewsForm } from '@/components/dashboard/NewsForm'

export default function NewNewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Nueva Noticia
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Crea una nueva noticia para tu radio
        </p>
      </div>

      <div className="card max-w-4xl">
        <NewsForm />
      </div>
    </div>
  )
}