import Link from 'next/link'
import type { ReactNode } from 'react'
import { PanelLogo } from '@/components/ui/PanelLogo'
import { LEGAL_LINKS, LEGAL_UPDATED_AT } from '@/lib/legal'

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export function LegalDocument({
  title,
  intro,
  highlight,
  sections,
}: {
  title: string
  intro: string
  highlight?: ReactNode
  sections: LegalSection[]
}) {
  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-900"
      style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif' }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="https://casterfly.com" className="flex items-center">
            <PanelLogo themeOverride="light" className="h-10 w-auto" />
          </Link>
          <Link
            href="/registro"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Crear cuenta
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {LEGAL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-brand transition-colors hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Última actualización: {LEGAL_UPDATED_AT}
        </p>
        <p className="mt-5 text-sm leading-relaxed text-gray-700">{intro}</p>

        {highlight && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
            {highlight}
          </div>
        )}

        <div className="mt-8 space-y-7">
          {sections.map((section, index) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold text-gray-900">
                {index + 1}. {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-relaxed text-gray-700">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
          Consultas sobre estos documentos:{' '}
          <a href="mailto:contacto@casterfly.com" className="text-brand hover:underline">
            contacto@casterfly.com
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CasterFly · Plataforma de radio y televisión online
        </div>
      </footer>
    </div>
  )
}
