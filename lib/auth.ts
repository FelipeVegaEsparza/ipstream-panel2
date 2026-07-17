import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            client: true
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.client?.id
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Si la URL es relativa, usar baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // Si la URL es del mismo origen, permitirla
      else if (new URL(url).origin === baseUrl) {
        return url
      }
      // Por defecto, redirigir al baseUrl
      return baseUrl
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.clientId = user.clientId
      }
      
      // Manejar actualizaciones de sesión para impersonación
      if (trigger === 'update' && session) {
        if (session.impersonation) {
          token.impersonation = session.impersonation
          token.originalRole = token.role
          token.originalClientId = token.clientId
          token.role = 'CLIENT'
          token.clientId = session.impersonation.clientId
        } else if (token.impersonation) {
          // Restaurar sesión original
          token.role = token.originalRole
          token.clientId = token.originalClientId
          delete token.impersonation
          delete token.originalRole
          delete token.originalClientId
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.clientId = token.clientId as string | null
        
        // Incluir información de impersonación si existe
        if (token.impersonation) {
          session.impersonation = token.impersonation as any
          session.originalUser = {
            id: token.sub!,
            role: token.originalRole as string,
            clientId: token.originalClientId as string | null
          }
        }
      }
      return session
    }
  }
}