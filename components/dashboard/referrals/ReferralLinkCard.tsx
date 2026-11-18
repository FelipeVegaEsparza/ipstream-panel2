'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

export function ReferralLinkCard({
  link,
  code,
  eligible,
}: {
  link: string | null
  code: string | null
  eligible: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copia tu enlace de referido:', link)
    }
  }

  async function share() {
    if (!link) return
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Te invito a CasterFly',
          text: 'Crea tu radio online con CasterFly usando mi enlace.',
          url: link,
        })
        return
      } catch {
        // El usuario canceló o el navegador no completó el share.
      }
    }
    copy()
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-[13px] font-medium text-foreground">Tu enlace personal</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Comparte este enlace con radios o TVs que quieran sumarse a CasterFly.
      </p>

      {eligible && link ? (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-[11px] text-foreground">{link}</code>
            <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] text-brand">
              {code}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-secondary"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-secondary"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartir
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-background px-3 py-3 text-[12px] text-muted-foreground">
          Tu enlace se activará cuando tu cuenta esté activa y hayas pagado tu primera mensualidad.
        </div>
      )}
    </section>
  )
}
