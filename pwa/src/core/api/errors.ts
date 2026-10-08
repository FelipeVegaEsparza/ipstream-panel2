/**
 * Error HTTP tipado de la capa de API. Permite distinguir un recurso
 * inexistente (404) de un error de conexión o de servidor (5xx/red) sin
 * depender del texto del mensaje.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
