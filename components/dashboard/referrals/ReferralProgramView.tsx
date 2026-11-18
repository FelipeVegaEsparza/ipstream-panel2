'use client'

import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import type { ReferralDashboardData } from '@/lib/referrals/dashboard'
import { ReferralSummaryCards } from './ReferralSummaryCards'
import { ReferralLinkCard } from './ReferralLinkCard'
import { ReferralProgress } from './ReferralProgress'
import { ReferralHistoryTable } from './ReferralHistoryTable'
import { ReferralRewardsTable } from './ReferralRewardsTable'

export function ReferralProgramView({ data }: { data: ReferralDashboardData }) {
  return (
    <div className="space-y-5">
      <DashboardPageHeader
        title="Programa de Referidos"
        description="Invita a nuevas radios y TVs. Cada dos referidos válidos ganas un mes gratis."
      />

      {!data.eligible && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-[13px] font-medium text-foreground">Aún no puedes participar</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">{data.eligibilityMessage}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cuando tu cuenta esté activa y tengas tu primera mensualidad pagada, tu enlace se
            habilitará automáticamente.
          </p>
        </section>
      )}

      <ReferralSummaryCards data={data} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReferralLinkCard link={data.link} code={data.code} eligible={data.eligible} />
        <ReferralProgress data={data} />
      </div>

      <ReferralHistoryTable referrals={data.referrals} />
      <ReferralRewardsTable rewards={data.rewards} />
    </div>
  )
}
