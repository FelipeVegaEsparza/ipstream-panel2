import { cookies } from 'next/headers'
import { DASHBOARD_LOCALE_COOKIE, normalizeDashboardLocale, type DashboardLocale } from './dashboard-i18n'

export function getDashboardLocale(): DashboardLocale {
  return normalizeDashboardLocale(cookies().get(DASHBOARD_LOCALE_COOKIE)?.value)
}
