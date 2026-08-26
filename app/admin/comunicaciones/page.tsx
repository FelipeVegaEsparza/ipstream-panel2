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
        <h1 className="text-3xl font-bold text-white mb-2">Comunicaciones</h1>
        <p className="text-gray-400">
          Enviá correos a los clientes (boletas, avisos, soporte), editá plantillas y seguí el rastreo de cada envío.
        </p>
      </div>

      <Tabs defaultValue="enviar" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3 bg-gray-800 border-gray-700">
          <TabsTrigger value="enviar" className="data-[state=active]:bg-cyan-600">Enviar</TabsTrigger>
          <TabsTrigger value="plantillas" className="data-[state=active]:bg-cyan-600">Plantillas</TabsTrigger>
          <TabsTrigger value="historial" className="data-[state=active]:bg-cyan-600">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="space-y-4">
          <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-5">
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
