'use client'

export default function TvSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Parrilla TV</h1>
        <p className="mt-1 text-sm text-gray-400">
          Programación horaria — próximamente
        </p>
      </div>

      <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 shadow-xl p-10 text-center">
        <div className="text-5xl mb-4">📺</div>
        <h2 className="text-xl font-semibold text-white mb-2">Próximamente</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          La parrilla de programación te permitirá programar qué playlist se reproduce en cada horario del día, como una grilla de TV tradicional.
        </p>
      </div>
    </div>
  )
}
