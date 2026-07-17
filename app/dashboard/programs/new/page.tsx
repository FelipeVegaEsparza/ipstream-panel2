import { ProgramForm } from '@/components/dashboard/ProgramForm'

export default function NewProgramPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Nuevo Programa
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Crea un nuevo programa para tu radio
        </p>
      </div>

      <div className="card max-w-2xl">
        <ProgramForm />
      </div>
    </div>
  )
}