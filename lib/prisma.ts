import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Cliente Prisma o cliente de transacción (`tx`). Permite que los helpers
 * escriban dentro de un `prisma.$transaction` sin acoplarse a la instancia global.
 */
export type PrismaDb = PrismaClient | Prisma.TransactionClient