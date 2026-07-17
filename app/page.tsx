'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // No redirigir hasta que se determine el estado de la sesión
    if (status === 'loading') {
      return;
    }

    if (!session) {
      router.replace('/auth/login');
    } else if (session.user.role === 'ADMIN') {
      router.replace('/admin');
    } else {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  return <h1>Redirigiendo...</h1>;
}
