import { initializeDirectories } from '@/lib/init-directories'

export async function DirectoryInitializer() {
  await initializeDirectories()
  return null
}