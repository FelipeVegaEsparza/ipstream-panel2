import { SponsorForm } from '@/components/dashboard/SponsorForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default function NewSponsorPage() {
  const t = dashboardT(getDashboardLocale())
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('sponsors.new')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('sponsors.newSubtitleActual')}
        </p>
      </div>

      <div className="card max-w-4xl">
        <SponsorForm />
      </div>
    </div>
  )
}