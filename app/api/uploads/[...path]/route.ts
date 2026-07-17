import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { corsHeaders, handleCors } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    console.log('Serving file request for path:', params.path)
    
    const filePath = join(process.cwd(), 'public', 'uploads', ...params.path)
    console.log('Full file path:', filePath)
    
    if (!existsSync(filePath)) {
      console.log('File not found:', filePath)
      return new NextResponse('File not found', { 
        status: 404,
        headers: corsHeaders
      })
    }

    const file = await readFile(filePath)
    console.log('File read successfully, size:', file.length)
    
    // Determinar el tipo de contenido basado en la extensión
    const extension = params.path[params.path.length - 1].split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
    }

    console.log('Content type:', contentType)

    return new NextResponse(file, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return new NextResponse('Internal Server Error', { 
      status: 500,
      headers: corsHeaders
    })
  }
}