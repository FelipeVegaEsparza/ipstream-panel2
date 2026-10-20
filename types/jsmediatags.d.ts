declare module 'jsmediatags/dist/jsmediatags.min.js' {
  const jsmediatags: {
    read: (
      file: Blob | File,
      options: {
        onSuccess?: (tag: { tags?: Record<string, unknown> }) => void
        onError?: (error: unknown) => void
      }
    ) => void
  }
  export default jsmediatags
}
