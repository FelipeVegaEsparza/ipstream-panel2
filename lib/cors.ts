import { NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/http-cache'

// CORS headers para API pública
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Función para manejar preflight requests (OPTIONS)
export function handleCors() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Función para crear respuesta con CORS headers
export function createCorsResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders
  })
}

// Cabecera de caché para contenido público read-only: un proxy/CDN puede
// reutilizar la respuesta y refrescar en segundo plano.
// Igual que createCorsResponse pero declarando la respuesta como cacheable.
// Usar SOLO en GET de contenido que no depende de identidad ni de estado vivo.
export function createCachedCorsResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: { ...corsHeaders, 'Cache-Control': PUBLIC_CACHE_CONTROL },
  })
}

// Función para crear respuesta de error con CORS headers
export function createCorsErrorResponse(error: string, status: number = 500) {
  return NextResponse.json(
    { error },
    { status, headers: corsHeaders }
  )
}