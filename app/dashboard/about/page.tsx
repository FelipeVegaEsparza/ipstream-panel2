import { PanelLogo } from '@/components/ui/PanelLogo'
import { APP_VERSION, APP_NAME } from '@/lib/version'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default function AboutPage() {
  const t = dashboardT(getDashboardLocale())
  return (
    <div className="space-y-8">
      <div className="text-center">
    <PanelLogo className="h-24 w-auto mx-auto mb-8 filter drop-" />
        <h1 className="text-4xl font-bold text-foreground mb-4">
          CasterFly
        </h1>
        <p className="text-xl text-muted-foreground">
          {t('about.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
            <svg className="w-6 h-6 text-brand mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('about.mainFeatures')}
          </h3>
          <div className="space-y-4">
            {([
              'about.feature.1',
              'about.feature.2',
              'about.feature.3',
              'about.feature.4',
              'about.feature.5',
              'about.feature.6',
              'about.feature.7',
              'about.feature.8',
              'about.feature.9',
              'about.feature.10',
              'about.feature.11',
              'about.feature.12'
            ] as const).map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-secondary/30 rounded-lg">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--live)]" />
                <span className="text-muted-foreground">{t(feature)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
            <svg className="w-6 h-6 text-brand mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('about.tech')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'Next.js 14', color: 'bg-brand' },
              { name: 'React 18', color: 'bg-brand' },
              { name: 'TypeScript', color: 'bg-brand' },
              { name: 'Tailwind CSS', color: 'bg-teal-500' },
              { name: 'Prisma ORM', color: 'bg-indigo-500' },
              { name: 'NextAuth.js', color: 'bg-purple-500' },
              { name: 'Zod Validation', color: 'bg-pink-500' },
              { name: 'SQLite/MySQL', color: 'bg-secondary' }
            ].map((tech, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-lg">
                <span className={`w-3 h-3 ${tech.color} rounded-full`}></span>
                <span className="text-muted-foreground text-sm">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-foreground mb-8 flex items-center">
          <svg className="w-6 h-6 text-brand mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {t('about.modules')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {([
       { name: 'about.module.basic', desc: 'about.module.basicDesc' },
       { name: 'about.module.social', desc: 'about.module.socialDesc' },
       { name: 'about.module.programs', desc: 'about.module.programsDesc' },
       { name: 'about.module.news', desc: 'about.module.newsDesc' },
       { name: 'about.module.podcasts', desc: 'about.module.podcastsDesc' },
       { name: 'about.module.videocasts', desc: 'about.module.videocastsDesc' },
       { name: 'about.module.videos', desc: 'about.module.videosDesc' },
       { name: 'about.module.sponsors', desc: 'about.module.sponsorsDesc' },
       { name: 'about.module.promotions', desc: 'about.module.promotionsDesc' },
       { name: 'about.module.api', desc: 'about.module.apiDesc' }
            ] as const).map((module, index) => (
      <div key={index} className="dashboard-panel p-5">
       <span className="mb-3 block h-px w-6 bg-signal" />
       <h4 className="mb-2 text-[13px] font-medium text-foreground">{t(module.name)}</h4>
              <p className="text-xs text-muted-foreground">{t(module.desc)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
          <svg className="w-6 h-6 text-brand mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          {t('about.news', { version: APP_VERSION })}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-brand mb-3">{t('about.separateModules')}</h4>
            {([
              'about.news.1',
              'about.news.2',
              'about.news.3',
              'about.news.4'
            ] as const).map((feature, index) => (
       <div key={index} className="flex items-start gap-3 rounded-control border border-line bg-surface-2 p-3">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span className="text-muted-foreground text-sm">{t(feature)}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-brand mb-3">{t('about.designImprovements')}</h4>
            {([
              'about.design.1',
              'about.design.2',
              'about.design.3',
              'about.design.4'
            ] as const).map((feature, index) => (
       <div key={index} className="flex items-start gap-3 rounded-control border border-line bg-surface-2 p-3">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                <span className="text-muted-foreground text-sm">{t(feature)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

   <div className="dashboard-panel p-8">
        <div className="text-center">
     <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-3">
            <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            {APP_NAME} v{APP_VERSION}
          </h3>
          <p className="text-brand text-lg mb-2">
            {t('about.footerTitle')}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {t('about.footerHint')}
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
              {t('about.activeModules')}
            </div>
            <div className="bg-brand/20 text-brand px-3 py-1 rounded-full border border-brand/30">
              {t('about.fullApi')}
            </div>
            <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/30">
              {t('about.accessibleDesign')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}