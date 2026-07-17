import { AnnouncerForm } from '@/components/dashboard/AnnouncerForm'

export default function NewAnnouncerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Locutor</h1>
        <p className="mt-1 text-sm text-gray-600">Agrega un nuevo locutor a tu radio</p>
      </div>
      <div className="card max-w-2xl">
        <AnnouncerForm />
      </div>
    </div>
  )
}
