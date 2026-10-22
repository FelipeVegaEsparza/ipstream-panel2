'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailComposer } from '@/components/admin/EmailComposer'
import { EmailTemplatesManager } from '@/components/admin/EmailTemplatesManager'
import { EmailLogsViewer } from '@/components/admin/EmailLogsViewer'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export default function ComunicacionesPage() {
  const { t } = useDashboardI18n()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('admin.communications.title')}</h1>
        <p className="text-muted-foreground">
          {t('admin.communications.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="enviar" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3 bg-card border-border">
          <TabsTrigger value="enviar" className="data-[state=active]:bg-brand">{t('admin.communications.send')}</TabsTrigger>
          <TabsTrigger value="plantillas" className="data-[state=active]:bg-brand">{t('admin.communications.templates')}</TabsTrigger>
          <TabsTrigger value="historial" className="data-[state=active]:bg-brand">{t('admin.communications.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="space-y-4">
          <div className="bg-card/60 rounded-xl border border-border p-5">
            <EmailComposer />
          </div>
        </TabsContent>

        <TabsContent value="plantillas" className="space-y-4">
          <EmailTemplatesManager />
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <EmailLogsViewer />
        </TabsContent>
      </Tabs>
    </div>
  )
}
