import { prisma } from '@/lib/prisma'

/**
 * Devuelve la URL de la imagen de fondo del login, o null si debe
 * usarse el fondo animado por defecto.
 */
export async function getLoginBackground(): Promise<string | null> {
  try {
    const config = await prisma.appConfig.findFirst({
      select: { loginBackgroundImage: true },
    })
    return config?.loginBackgroundImage || null
  } catch (error) {
    console.error('Error cargando config de fondo del login:', error)
    return null
  }
}
