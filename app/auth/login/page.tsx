import { getLoginBackground } from '@/lib/login-background'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const backgroundImage = await getLoginBackground()
  return <LoginForm backgroundImage={backgroundImage} />
}
