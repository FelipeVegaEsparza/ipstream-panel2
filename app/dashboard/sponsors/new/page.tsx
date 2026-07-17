import { SponsorForm } from '@/components/dashboard/SponsorForm'

export default function NewSponsorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Nuevo Auspiciador
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Agrega un nuevo auspiciador o sponsor
        </p>
      </div>

      <div className="card max-w-4xl">
        <SponsorForm />
      </div>
    </div>
  )
}