// Utilidades para formateo de monedas CLP y USD

export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'CLP') {
    // Formato chileno: $12.345 (sin decimales, con separador de miles)
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  } else if (currency === 'USD') {
    // Formato estadounidense: $12,345.67 (con decimales)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  // Fallback para otras monedas
  return `${currency} ${amount.toLocaleString()}`
}

export function formatPrice(price: number, currency: string, interval: string): string {
  const formattedAmount = formatCurrency(price, currency)
  const intervalText = interval === 'monthly' ? 'mes' : 'año'
  return `${formattedAmount}/${intervalText}`
}

export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'CLP':
      return '$'
    case 'USD':
      return '$'
    default:
      return currency
  }
}

export function getCurrencyName(currency: string): string {
  switch (currency) {
    case 'CLP':
      return 'Peso Chileno'
    case 'USD':
      return 'Dólar Estadounidense'
    default:
      return currency
  }
}

// Configuración por defecto
export const DEFAULT_CURRENCY = 'CLP'
export const SUPPORTED_CURRENCIES = [
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$' }
]