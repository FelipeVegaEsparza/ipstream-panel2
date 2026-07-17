import { EventForm } from '@/components/dashboard/EventForm'

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Evento</h1>
        <p className="mt-1 text-sm text-gray-600">Agrega un evento o transmisión especial</p>
      </div>
      <div className="card max-w-2xl">
        <EventForm />
      </div>
    </div>
  )
}
