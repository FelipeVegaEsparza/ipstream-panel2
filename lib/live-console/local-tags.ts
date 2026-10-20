import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js'

export interface LocalTags {
  title?: string
  artist?: string
  picture?: Blob
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function readLocalTags(file: Blob | File): Promise<LocalTags> {
  return new Promise((resolve) => {
    try {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          const tags = tag.tags || {}
          const title = asString(tags.title)
          const artist = asString(tags.artist)
          const picture = tags.picture as
            | { data?: number[] | Uint8Array; format?: string }
            | undefined
          let pictureBlob: Blob | undefined
          if (picture?.data) {
            const bytes = picture.data instanceof Uint8Array
              ? picture.data
              : Uint8Array.from(picture.data)
            pictureBlob = new Blob([bytes], { type: picture.format || 'image/jpeg' })
          }
          resolve({ title, artist, picture: pictureBlob })
        },
        onError: () => resolve({}),
      })
    } catch {
      resolve({})
    }
  })
}
