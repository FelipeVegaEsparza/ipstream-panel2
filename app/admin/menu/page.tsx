import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GlobalMenuConfig } from '@/components/admin/GlobalMenuConfig'

export const dynamic = 'force-dynamic'

export default async function GlobalMenuPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">Acceso no autorizado</div>
  }

  const config = await prisma.appConfig.findFirst()
  let initialHidden: string[] = []
  if (config?.hiddenMenuItems) {
    try {
      const parsed = JSON.parse(config.hiddenMenuItems)
      if (Array.isArray(parsed)) {
        initialHidden = parsed.filter((k) => typeof k === 'string')
      }
    } catch {
      // JSON inválido: ignorar
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Menú Global</h1>
        <p className="text-sm text-gray-400 mt-1">
          Los items que ocultes acá no se mostrarán en el menú de <strong className="text-gray-200">ningún cliente</strong>,
          sin importar su configuración individual. El override es absoluto.
        </p>
      </div>
      <GlobalMenuConfig initialHidden={initialHidden} />
    </div>
  )
}
