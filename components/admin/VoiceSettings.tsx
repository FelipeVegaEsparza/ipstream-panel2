'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { FishAudioSettings } from './FishAudioSettings'
import { ElevenLabsSettings } from './ElevenLabsSettings'

export function VoiceSettings() {
  const { t } = useDashboardI18n()
  return (
    <Tabs defaultValue="fish" className="space-y-5">
      <TabsList className="grid w-full grid-cols-2 border-border bg-card">
        <TabsTrigger value="fish" className="data-[state=active]:bg-brand">
          {t('admin.voice.tabFish')}
        </TabsTrigger>
        <TabsTrigger value="elevenlabs" className="data-[state=active]:bg-brand">
          {t('admin.voice.tabEleven')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="fish">
        <FishAudioSettings />
      </TabsContent>
      <TabsContent value="elevenlabs">
        <ElevenLabsSettings />
      </TabsContent>
    </Tabs>
  )
}
