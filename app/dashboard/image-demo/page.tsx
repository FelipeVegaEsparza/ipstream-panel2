import { ImageUpload } from '@/components/ui/ImageUpload'

export default function ImageDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Demo de Upload de Imágenes
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Prueba el sistema de subida de imágenes integrado
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Funcionalidades del Sistema de Upload
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Drag & Drop de imágenes</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Click para seleccionar archivo</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Vista previa inmediata</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Validación de tipo de archivo</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Límite de tamaño (5MB)</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Eliminación automática del servidor</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Alternativa con URL externa</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <span>Organización por cliente</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Formatos Soportados
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>JPEG / JPG</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>PNG</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>GIF</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span>WebP</span>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-2">Límites:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Tamaño máximo: 5MB</li>
              <li>• Solo imágenes</li>
              <li>• Nombres seguros automáticos</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          ¿Dónde se usa el upload de imágenes?
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Datos Básicos:</strong> Logo y cover del proyecto</p>
          <p>• <strong>Programas:</strong> Imagen representativa de cada programa</p>
          <p>• <strong>Noticias:</strong> Imagen principal de cada noticia</p>
          <p>• <strong>Auspiciadores:</strong> Logo de cada sponsor</p>
          <p>• <strong>Promociones:</strong> Imagen promocional</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-green-800 mb-2">
          Organización de Archivos
        </h3>
        <div className="text-sm text-green-700">
          <p>Las imágenes se organizan automáticamente por cliente:</p>
          <code className="block bg-green-100 px-3 py-2 rounded mt-2 text-xs">
            /public/uploads/[tu-client-id]/timestamp_nombre-archivo.jpg
          </code>
          <p className="mt-2">Esto garantiza que cada cliente solo pueda acceder a sus propias imágenes.</p>
        </div>
      </div>
    </div>
  )
}