/**
 * Convierte URLs de imágenes del formato antiguo al nuevo formato de API
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // Si ya es una URL de API, devolverla tal como está
  if (url.startsWith('/api/uploads/')) {
    return url
  }
  
  // Si es una URL del formato antiguo, convertirla
  if (url.startsWith('/uploads/')) {
    return `/api${url}`
  }
  
  // Si es una URL externa, devolverla tal como está
  return url
}

/**
 * Convierte URLs de imágenes del formato de API al formato de almacenamiento
 */
export function getStorageImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // Si es una URL de API, convertirla al formato de almacenamiento
  if (url.startsWith('/api/uploads/')) {
    return url.replace('/api/uploads/', '/uploads/')
  }
  
  // Si ya es una URL de almacenamiento, devolverla tal como está
  if (url.startsWith('/uploads/')) {
    return url
  }
  
  // Si es una URL externa, devolverla tal como está
  return url
}