import { getLoginBackground } from '@/lib/login-background'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string }
}) {
  const backgroundImage = await getLoginBackground()
  return (
    <LoginForm
      backgroundImage={backgroundImage}
      callbackUrl={searchParams?.callbackUrl ?? null}
    />
  )
}
