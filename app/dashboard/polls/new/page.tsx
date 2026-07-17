import { PollForm } from '@/components/dashboard/PollForm'

export default function NewPollPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Encuesta</h1>
        <p className="mt-1 text-sm text-gray-600">Crea una encuesta para tus oyentes</p>
      </div>
      <div className="card max-w-2xl">
        <PollForm />
      </div>
    </div>
  )
}
