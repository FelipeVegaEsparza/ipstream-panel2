export interface RequestOptions {
  method?: string
  headers?: HeadersInit
  body?: string
  timeout?: number
  retries?: number
}

const DEFAULT_TIMEOUT = 10_000
const DEFAULT_RETRIES = 3
const BASE_BACKOFF = 1000
const MAX_JITTER = 0.5

// Solo los métodos idempotentes se reintentan por defecto. Reintentar una
// escritura puede duplicar el efecto en el servidor si ya la procesó pero la
// respuesta se perdió (p. ej. votos, que la API no deduplica).
function isIdempotentMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD'
}

const inFlight = new Map<string, Promise<Response>>()

function requestKey(method: string, url: string, body?: string): string {
  // Los GET idénticos concurrentes pueden compartir petición, pero dos
  // escrituras (POST/PUT/...) a la misma URL con distinto body NO deben
  // deduplicarse (se perdería la segunda).
  if (method === 'GET' || method === 'HEAD') return `${method}:${url}`
  return `${method}:${url}:${body ?? ''}`
}

function isRetryableStatus(status: number): boolean {
  return status >= 500
}

function isRetryableError(error: unknown): boolean {
  return error instanceof TypeError || error instanceof DOMException
}

function delay(attempt: number): Promise<void> {
  const backoff = BASE_BACKOFF * 2 ** attempt
  const jitter = 1 + Math.random() * MAX_JITTER
  return new Promise((resolve) => setTimeout(resolve, backoff * jitter))
}

export async function request(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const method = options.method ?? 'GET'
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const retries =
    options.retries ?? (isIdempotentMethod(method) ? DEFAULT_RETRIES : 0)
  const key = requestKey(method, url, options.body)

  const run = async (attempt: number): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: options.headers,
        body: options.body,
        signal: controller.signal
      })

      if (isRetryableStatus(response.status) && attempt < retries) {
        clearTimeout(timer)
        await delay(attempt)
        return run(attempt + 1)
      }

      clearTimeout(timer)
      return response
    } catch (error) {
      clearTimeout(timer)
      if (attempt < retries && isRetryableError(error)) {
        await delay(attempt)
        return run(attempt + 1)
      }
      throw error
    }
  }

  const existing = inFlight.get(key)
  if (existing) {
    return existing
  }

  const promise = run(0).finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}
