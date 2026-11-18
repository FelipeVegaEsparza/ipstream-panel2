// =====================================================
// Programa de referidos — constantes compartidas
// =====================================================

export const REFERRAL_STATUS = {
  REGISTERED: 'registered',
  PENDING_CONTRACT: 'pending_contract',
  PENDING_FIRST_PAYMENT: 'pending_first_payment',
  FIRST_PAYMENT_CONFIRMED: 'first_payment_confirmed',
  PENDING_SECOND_PAYMENT: 'pending_second_payment',
  VALID: 'valid',
  REJECTED: 'rejected',
} as const

export type ReferralStatus = (typeof REFERRAL_STATUS)[keyof typeof REFERRAL_STATUS]

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  registered: 'Registrado',
  pending_contract: 'Pendiente de contratación',
  pending_first_payment: 'Pendiente de primer pago',
  first_payment_confirmed: 'Primer pago confirmado',
  pending_second_payment: 'Pendiente de segundo pago',
  valid: 'Referido válido',
  rejected: 'Rechazado',
}

export const REWARD_STATUS = {
  AVAILABLE: 'available',
  APPLIED: 'applied',
  EXPIRED: 'expired',
  VOIDED: 'voided',
} as const

export type RewardStatus = (typeof REWARD_STATUS)[keyof typeof REWARD_STATUS]

export const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  available: 'Disponible',
  applied: 'Aplicado',
  expired: 'Vencido',
  voided: 'Anulado',
}

export const LEDGER_TYPE = {
  REWARD: 'reward',
  APPLICATION: 'application',
  VOID: 'void',
  DEBT: 'debt',
  ADJUSTMENT: 'adjustment',
} as const

export type LedgerType = (typeof LEDGER_TYPE)[keyof typeof LEDGER_TYPE]

export const NOTIFICATION_TYPE = {
  REFERRAL_REGISTERED: 'referral_registered',
  REFERRAL_FIRST_PAYMENT: 'referral_first_payment',
  REFERRAL_VALID: 'referral_valid',
  REWARD_GENERATED: 'referral_reward_generated',
  CREDIT_APPLIED: 'referral_credit_applied',
  ADMIN_CHANGE: 'referral_admin_change',
} as const

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]

export const REFERRAL_FLAG_REASON = {
  SAME_IP: 'same_ip',
  EMAIL_ALIAS: 'email_alias',
  PAYMENT_REFUNDED: 'payment_refunded',
} as const

export const REFERRAL_FLAG_LABELS: Record<string, string> = {
  same_ip: 'Misma IP que el referente',
  email_alias: 'Email con variante del referente',
  payment_refunded: 'Pago de validación reembolsado',
}

export const REFERRAL_CODE_PREFIX = 'CAST-'
export const REFERRAL_CODE_MAX_LENGTH = 32
export const REFERRAL_CODE_MIN_LENGTH = 4

/** Tope de ciclos que el motor de crédito puede cubrir en una sola ejecución. */
export const MAX_CREDIT_CYCLES_PER_RUN = 24

/** Tasa por defecto: pesos chilenos por 1 dólar. */
export const DEFAULT_REFERRAL_FX_USD_CLP = 950

/** Ventana de revisión del poller para referidos recientes. */
export const REFERRAL_SWEEP_WINDOW_DAYS = 7

export const REFERRAL_REWARD_MONTHS = 1
