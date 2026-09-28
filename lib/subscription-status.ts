// =====================================================
// Subscription statuses — única fuente de verdad
// =====================================================
// Los estados de suscripción se persisten como String en la DB (no hay enum).
// Este módulo centraliza los literales para que la escritura y la lectura
// coincidan: el bug original era el dashboard consultando 'ACTIVE' mientras el
// resto del sistema escribía 'active' (PostgreSQL compara de forma
// case-sensitive, así que nunca coincidían).

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  TRIALING: 'trialing',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]
