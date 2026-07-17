import { VideoForm } from '@/components/dashboard/VideoForm'

export default function NewVideoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Nuevo Video
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Agrega un nuevo video al ranking
        </p>
      </div>

      <div className="card max-w-2xl">
        <VideoForm />
      </div>
    </div>
  )
}