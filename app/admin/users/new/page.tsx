import { UserForm } from '@/components/admin/UserForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default function NewUserPage() {
  const t = dashboardT(getDashboardLocale())
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin.users.newTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.users.newSubtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <UserForm />
      </div>
    </div>
  )
}