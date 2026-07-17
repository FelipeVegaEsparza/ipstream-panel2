import { UserForm } from '@/components/admin/UserForm'

export default function NewUserPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Crear Nuevo Cliente
        </h1>
        <p className="text-gray-400">
          Agrega un nuevo cliente al sistema IPStream Panel
        </p>
      </div>

      <div className="card max-w-2xl">
        <UserForm />
      </div>
    </div>
  )
}