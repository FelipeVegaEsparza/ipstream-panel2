import { GalleryForm } from '@/components/dashboard/GalleryForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default function NewGalleryPage() {
  const t = dashboardT(getDashboardLocale())
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('galleries.form.new')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('galleries.form.newSubtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <GalleryForm />
      </div>
    </div>
  )
}
