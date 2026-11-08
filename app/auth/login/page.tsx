import { Archivo } from 'next/font/google'
import { getLoginBackground } from '@/lib/login-background'
import { isVideoLoginMedia } from '@/lib/login-media'
import LoginForm from './LoginForm'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string }
}) {
  const backgroundMedia = await getLoginBackground()
  return (
    <div className={archivo.className}>
      <LoginForm
        backgroundMedia={backgroundMedia}
        backgroundIsVideo={isVideoLoginMedia(backgroundMedia)}
        callbackUrl={searchParams?.callbackUrl ?? null}
      />
    </div>
  )
}
