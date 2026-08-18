import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DirectoryInitializer } from '@/components/providers/DirectoryInitializer'
import AuthSessionProvider from '@/components/providers/AuthSessionProvider'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

// Toda la app es dinámica: cada página usa getServerSession() (cookies),
// fetch a la DB, o consulta el agente. Marcar todo el árbol como
// force-dynamic evita errores 'cannot be statically generated' durante
// el build de Next.js.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'IPStream Panel',
  description: 'Panel de gestión de contenido para radio y streaming',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
          <AuthSessionProvider>
            <DirectoryInitializer />
            {children}
            {/* Script global para sanitizar texto pegado - DESACTIVADO TEMPORALMENTE */}
            {/* <Script src="/text-sanitizer.js" strategy="afterInteractive" /> */}
          </AuthSessionProvider>
        </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}