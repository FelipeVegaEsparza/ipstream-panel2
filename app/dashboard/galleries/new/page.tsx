import { GalleryForm } from '@/components/dashboard/GalleryForm'

export default function NewGalleryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Galería</h1>
        <p className="mt-1 text-sm text-gray-600">
          Crea una nueva galería de imágenes
        </p>
      </div>

      <div className="card max-w-2xl">
        <GalleryForm />
      </div>
    </div>
  )
}
