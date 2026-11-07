export type LoginMediaKind = 'image' | 'video'

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])

export function getLoginMediaKind(url: string | null | undefined): LoginMediaKind {
  if (!url) return 'image'

  try {
    const pathname = new URL(url, 'https://casterfly.com').pathname.toLowerCase()
    const extension = pathname.split('.').pop() ?? ''
    return VIDEO_EXTENSIONS.has(extension) ? 'video' : 'image'
  } catch {
    return 'image'
  }
}

export function isVideoLoginMedia(url: string | null | undefined): boolean {
  return getLoginMediaKind(url) === 'video'
}
