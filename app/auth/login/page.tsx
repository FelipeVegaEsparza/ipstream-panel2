import { getLoginBackground } from '@/lib/login-background'
import { isVideoLoginMedia } from '@/lib/login-media'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string }
}) {
  const backgroundMedia = await getLoginBackground()
  return (
    <LoginForm
      backgroundMedia={backgroundMedia}
      backgroundIsVideo={isVideoLoginMedia(backgroundMedia)}
      callbackUrl={searchParams?.callbackUrl ?? null}
    />
  )
}
