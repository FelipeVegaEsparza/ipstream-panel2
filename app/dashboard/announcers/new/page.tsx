import { AnnouncerForm } from '@/components/dashboard/AnnouncerForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default function NewAnnouncerPage() {
  const t = dashboardT(getDashboardLocale())
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('announcers.newTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('announcers.newSubtitle')}</p>
      </div>
      <div className="card max-w-2xl">
        <AnnouncerForm />
      </div>
    </div>
  )
}
