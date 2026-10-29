import type { ReactNode } from 'react'

interface DashboardPageHeaderProps {
 title: string
 description?: string
 actions?: ReactNode
}

export function DashboardPageHeader({ title, description, actions }: DashboardPageHeaderProps) {
 return (
  <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
   <div className="min-w-0">
    <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
    {description && <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{description}</p>}
   </div>
   {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
 )
}
