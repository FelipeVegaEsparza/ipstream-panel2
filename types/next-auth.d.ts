import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      clientId?: string | null
    }
    impersonation?: {
      clientId: string
      clientEmail: string
      clientName: string
      adminId: string
      adminEmail: string
    }
    originalUser?: {
      id: string
      role: string
      clientId?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: string
    clientId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    clientId?: string | null
    impersonation?: {
      clientId: string
      clientEmail: string
      clientName: string
      adminId: string
      adminEmail: string
    }
    originalRole?: string
    originalClientId?: string | null
  }
}