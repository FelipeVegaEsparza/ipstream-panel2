import { NextResponse } from 'next/server';

// Dinámico: el build SHA vive en el entorno del contenedor (runner), no en el
// build de Next. Sin esto, la ruta se prerenderiza y `build` quedaría en null.
export const dynamic = 'force-dynamic';

// This route is used by the health checker to verify that the application is running.
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      // SHA del commit con el que se construyó la imagen (lo inyecta el
      // Dockerfile vía build-arg GIT_SHA). Sirve para detectar drift
      // entre el panel y los nodos de streaming.
      build: process.env.APP_GIT_SHA || null,
    },
    { status: 200 }
  );
}
