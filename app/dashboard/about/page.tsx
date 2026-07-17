import { APP_VERSION, APP_NAME } from '@/lib/version'

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <img
          src="/logo-ipstream.png"
          alt="IPStream Panel"
          className="h-24 w-auto mx-auto mb-8 filter drop-shadow-2xl"
        />
        <h1 className="text-4xl font-bold text-white mb-4">
          IPStream Panel
        </h1>
        <p className="text-xl text-gray-300">
          Panel completo de gestión de contenido para radio y streaming
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <svg className="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Características Principales
          </h3>
          <div className="space-y-4">
            {[
              'Dashboard de administración completo',
              'Gestión de programación de radio',
              'Sistema de noticias con slugs únicos',
              'Podcasts de audio con gestión completa',
              'Videocasts con integración de YouTube',
              'Ranking de videos con reordenamiento',
              'Gestión completa de auspiciadores',
              'Sistema de promociones',
              'Upload de archivos multimedia',
              'API REST pública completa',
              'Diseño responsive y accesible',
              'Sistema de contraste mejorado'
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
                <span className="text-green-400 mt-0.5">✓</span>
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <svg className="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Tecnologías Utilizadas
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Next.js 14', color: 'bg-blue-500' },
              { name: 'React 18', color: 'bg-cyan-500' },
              { name: 'TypeScript', color: 'bg-blue-600' },
              { name: 'Tailwind CSS', color: 'bg-teal-500' },
              { name: 'Prisma ORM', color: 'bg-indigo-500' },
              { name: 'NextAuth.js', color: 'bg-purple-500' },
              { name: 'Zod Validation', color: 'bg-pink-500' },
              { name: 'SQLite/MySQL', color: 'bg-gray-500' }
            ].map((tech, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg">
                <span className={`w-3 h-3 ${tech.color} rounded-full`}></span>
                <span className="text-gray-300 text-sm">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-8 flex items-center">
          <svg className="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Módulos Disponibles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[
            { icon: '📊', name: 'Datos Básicos', desc: 'Información del proyecto', color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30' },
            { icon: '📱', name: 'Redes Sociales', desc: 'Enlaces a plataformas', color: 'from-green-500/20 to-green-600/20 border-green-500/30' },
            { icon: '🎙️', name: 'Programas', desc: 'Programación de radio', color: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30' },
            { icon: '📰', name: 'Noticias', desc: 'Sistema de noticias', color: 'from-purple-500/20 to-purple-600/20 border-purple-500/30' },
            { icon: '🎵', name: 'Podcasts', desc: 'Episodios de audio', color: 'from-indigo-500/20 to-purple-600/20 border-indigo-500/30' },
            { icon: '🎥', name: 'Videocasts', desc: 'Episodios con YouTube', color: 'from-red-500/20 to-pink-600/20 border-red-500/30' },
            { icon: '📺', name: 'Ranking Videos', desc: 'Top musical', color: 'from-orange-500/20 to-red-600/20 border-orange-500/30' },
            { icon: '🏢', name: 'Auspiciadores', desc: 'Gestión de sponsors', color: 'from-teal-500/20 to-cyan-600/20 border-teal-500/30' },
            { icon: '🎉', name: 'Promociones', desc: 'Ofertas especiales', color: 'from-pink-500/20 to-rose-600/20 border-pink-500/30' },
            { icon: '🔧', name: 'API REST', desc: 'Endpoints públicos', color: 'from-gray-500/20 to-gray-600/20 border-gray-500/30' }
          ].map((module, index) => (
            <div key={index} className={`text-center p-6 bg-gradient-to-br ${module.color} rounded-xl border backdrop-blur-sm hover:scale-105 transition-transform duration-200`}>
              <div className="text-3xl mb-3">{module.icon}</div>
              <h4 className="font-semibold text-white mb-2">{module.name}</h4>
              <p className="text-xs text-gray-400">{module.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          Novedades v{APP_VERSION}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-cyan-400 mb-3">🎵 Módulos Separados</h4>
            {[
              'Podcasts de audio independientes',
              'Videocasts con integración YouTube',
              'APIs públicas específicas para cada tipo',
              'Formularios optimizados por contenido'
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
                <span className="text-indigo-400 mt-0.5">✨</span>
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-cyan-400 mb-3">🎨 Mejoras de Diseño</h4>
            {[
              'Sistema de contraste mejorado',
              'Legibilidad optimizada en todas las cards',
              'Botones de acción consistentes',
              'Badges y elementos visuales unificados'
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
                <span className="text-cyan-400 mt-0.5">🎨</span>
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            {APP_NAME} v{APP_VERSION}
          </h3>
          <p className="text-cyan-300 text-lg mb-2">
            Sistema completo de gestión de contenido para radio y streaming
          </p>
          <p className="text-gray-400 text-sm mb-4">
            Desarrollado con las mejores tecnologías web modernas
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
              10 Módulos Activos
            </div>
            <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
              API REST Completa
            </div>
            <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/30">
              Diseño Accesible
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}