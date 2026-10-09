'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailComposer } from '@/components/admin/EmailComposer'
import { EmailTemplatesManager } from '@/components/admin/EmailTemplatesManager'
import { EmailLogsViewer } from '@/components/admin/EmailLogsViewer'

export default function ComunicacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Comunicaciones</h1>
        <p className="text-muted-foreground">
          Envía correos a los clientes (boletas, avisos, soporte), edita plantillas y seguí el rastreo de cada envío.
        </p>
      </div>

      <Tabs defaultValue="enviar" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3 bg-card border-border">
          <TabsTrigger value="enviar" className="data-[state=active]:bg-brand">Enviar</TabsTrigger>
          <TabsTrigger value="plantillas" className="data-[state=active]:bg-brand">Plantillas</TabsTrigger>
          <TabsTrigger value="historial" className="data-[state=active]:bg-brand">Historial</TabsTrigger>
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
