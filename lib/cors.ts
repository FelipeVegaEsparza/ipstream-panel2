import { NextResponse } from 'next/server'

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

// Función para crear respuesta de error con CORS headers
export function createCorsErrorResponse(error: string, status: number = 500) {
  return NextResponse.json(
    { error },
    { status, headers: corsHeaders }
  )
}