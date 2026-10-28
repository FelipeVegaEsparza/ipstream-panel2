import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { invalidateClientSitesConfig } from '@/lib/client-sites-config'
import { getElevenLabsConfig, invalidateElevenLabsConfig } from '@/lib/elevenlabs-config'
import { getFishAudioConfig, invalidateFishAudioConfig, parseFishVoiceCatalog } from '@/lib/fish-audio-config'
import { validFishAudioModel } from '@/lib/fish-audio-models'
import { ELEVENLABS_MODELS } from '@/lib/elevenlabs-models'
import { parseVoiceCatalog } from '@/lib/elevenlabs-voices'
import { isTtsQualityPresetId } from '@/lib/tts-quality'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({
        data: { enableGenericNews: false }
      })
    }

    const [eleven, fish] = await Promise.all([
      getElevenLabsConfig(),
      getFishAudioConfig(),
    ])

    // Config de sitios: valor efectivo (DB o env). El token nunca se devuelve.
    return NextResponse.json({
      enableGenericNews: config.enableGenericNews,
      adminNotifyEmail: config.adminNotifyEmail,
      trialDays: config.trialDays,
      panelLogoDarkUrl: config.panelLogoDarkUrl || '',
      panelLogoLightUrl: config.panelLogoLightUrl || '',
      panelFaviconUrl: config.panelFaviconUrl || '',
      clientSitesDomain: config.clientSitesDomain || process.env.CLIENT_SITES_DOMAIN || '',
      clientSitesTarget: config.clientSitesTarget || process.env.CLIENT_SITES_TARGET || '',
      clientSitesIp: config.clientSitesIp || process.env.CLIENT_SITES_IP || '',
      cloudflareTokenSet: Boolean(config.cloudflareApiTokenEnc || process.env.CLOUDFLARE_API_TOKEN),
      elevenLabsKeySet: Boolean(eleven.apiKey),
      elevenLabsVoiceId: eleven.voiceId,
      elevenLabsModel: eleven.model,
      elevenLabsEnabled: eleven.enabled,
      ttsCacheEnabled: eleven.cacheEnabled,
      elevenLabsVoices: parseVoiceCatalog(config.elevenLabsVoices),
      ttsQualityPreset: eleven.qualityPreset,
      pronunciationDictionaryId: eleven.pronunciationDictionaryId || '',
      pronunciationDictionaryVersionId: eleven.pronunciationDictionaryVersionId || '',
      ttsProvider: config.ttsProvider === 'fish' ? 'fish' : 'elevenlabs',
      fishAudioKeySet: Boolean(fish.apiKey),
      fishAudioModel: fish.model,
      fishAudioReferenceId: fish.referenceId,
      fishAudioVoices: fish.voices,
      fishAudioDirection: fish.direction,
    })
  } catch (error) {
    console.error('Error getting app config:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      enableGenericNews,
      adminNotifyEmail,
      trialDays,
      panelLogoDarkUrl,
      panelLogoLightUrl,
      panelFaviconUrl,
      clientSitesDomain,
      clientSitesTarget,
      clientSitesIp,
      cloudflareApiToken,
      elevenLabsApiKey,
      elevenLabsVoiceId,
      elevenLabsModel,
      elevenLabsEnabled,
      ttsCacheEnabled,
      clearElevenLabsApiKey,
      elevenLabsVoices,
      ttsQualityPreset,
      pronunciationDictionaryId,
      pronunciationDictionaryVersionId,
      ttsProvider,
      fishAudioApiKey,
      clearFishAudioApiKey,
      fishAudioModel,
      fishAudioReferenceId,
      fishAudioVoices,
      fishAudioDirection,
    } = body

    let trialDaysValue: number | undefined
    if (trialDays !== undefined) {
      const parsed = Number(trialDays)
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) {
        return NextResponse.json({ error: 'trialDays debe ser un entero entre 0 y 365' }, { status: 400 })
      }
      trialDaysValue = parsed
    }

    // Token: si viene definido, se guarda (encriptado) o se limpia si es vacío.
    // Si no viene, se deja como está.
    let tokenUpdate: { cloudflareApiTokenEnc: string | null } | undefined
    if (cloudflareApiToken !== undefined) {
      const raw = typeof cloudflareApiToken === 'string' ? cloudflareApiToken.trim() : ''
      tokenUpdate = { cloudflareApiTokenEnc: raw ? encrypt(raw) : null }
    }

    let elevenLabsKeyUpdate: { elevenLabsApiKeyEnc: string | null } | undefined
    if (clearElevenLabsApiKey === true) {
      elevenLabsKeyUpdate = { elevenLabsApiKeyEnc: null }
    } else if (elevenLabsApiKey !== undefined) {
      const raw = typeof elevenLabsApiKey === 'string' ? elevenLabsApiKey.trim() : ''
      if (raw) elevenLabsKeyUpdate = { elevenLabsApiKeyEnc: encrypt(raw) }
    }

    let elevenLabsModelValue: string | undefined
    if (elevenLabsModel !== undefined) {
      const model = String(elevenLabsModel)
      if (!ELEVENLABS_MODELS.some((entry) => entry.id === model)) {
        return NextResponse.json({ error: 'Modelo de ElevenLabs inválido' }, { status: 400 })
      }
      elevenLabsModelValue = model
    }

    let voicesValue: { id: string; name: string; description?: string }[] | undefined
    if (elevenLabsVoices !== undefined) {
      if (!Array.isArray(elevenLabsVoices)) {
        return NextResponse.json({ error: 'elevenLabsVoices debe ser un array' }, { status: 400 })
      }
      voicesValue = elevenLabsVoices
        .filter((v) => v && typeof v.id === 'string' && typeof v.name === 'string')
        .map((v) => ({
          id: v.id.trim().slice(0, 191),
          name: v.name.trim().slice(0, 191),
          ...(typeof v.description === 'string' && v.description.trim()
            ? { description: v.description.trim().slice(0, 300) }
            : {}),
        }))
        .filter((v) => v.id && v.name)
        .slice(0, 30)
    }

    let qualityPresetValue: string | undefined
    if (ttsQualityPreset !== undefined) {
      if (!isTtsQualityPresetId(ttsQualityPreset)) {
        return NextResponse.json({ error: 'Preset de calidad inválido' }, { status: 400 })
      }
      qualityPresetValue = ttsQualityPreset
    }

    const elevenLabsData = {
      ...(elevenLabsVoiceId !== undefined
        ? { elevenLabsVoiceId: String(elevenLabsVoiceId).trim() || null }
        : {}),
      ...(voicesValue !== undefined ? { elevenLabsVoices: JSON.stringify(voicesValue) } : {}),
      ...(elevenLabsModelValue !== undefined ? { elevenLabsModel: elevenLabsModelValue } : {}),
      ...(typeof elevenLabsEnabled === 'boolean' ? { elevenLabsEnabled } : {}),
      ...(typeof ttsCacheEnabled === 'boolean' ? { ttsCacheEnabled } : {}),
      ...(qualityPresetValue !== undefined ? { ttsQualityPreset: qualityPresetValue } : {}),
      ...(pronunciationDictionaryId !== undefined
        ? { pronunciationDictionaryId: String(pronunciationDictionaryId).trim().slice(0, 191) || null }
        : {}),
      ...(pronunciationDictionaryVersionId !== undefined
        ? { pronunciationDictionaryVersionId: String(pronunciationDictionaryVersionId).trim().slice(0, 191) || null }
        : {}),
      ...(elevenLabsKeyUpdate || {}),
    }

    const normalizePanelLogo = (value: unknown) => {
      if (value === undefined) return undefined
      if (value === null) return null
      const raw = typeof value === 'string' ? value.trim() : ''
      if (!raw) return null
      if (raw.startsWith('/api/uploads/') || /^https?:\/\//i.test(raw)) return raw.slice(0, 500)
      throw new Error('URL de logo inválida')
    }
    let panelLogoData: {
      panelLogoDarkUrl?: string | null
      panelLogoLightUrl?: string | null
      panelFaviconUrl?: string | null
    } = {}
    try {
      const dark = normalizePanelLogo(panelLogoDarkUrl)
      const light = normalizePanelLogo(panelLogoLightUrl)
      const favicon = normalizePanelLogo(panelFaviconUrl)
      panelLogoData = {
        ...(dark !== undefined ? { panelLogoDarkUrl: dark } : {}),
        ...(light !== undefined ? { panelLogoLightUrl: light } : {}),
        ...(favicon !== undefined ? { panelFaviconUrl: favicon } : {}),
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'URL de logo inválida' },
        { status: 400 }
      )
    }

    let providerValue: 'elevenlabs' | 'fish' | undefined
    if (ttsProvider !== undefined) {
      if (ttsProvider !== 'elevenlabs' && ttsProvider !== 'fish') {
        return NextResponse.json({ error: 'Proveedor de voz inválido' }, { status: 400 })
      }
      providerValue = ttsProvider
    }

    let fishKeyUpdate: { fishAudioApiKeyEnc: string | null } | undefined
    if (clearFishAudioApiKey === true) {
      fishKeyUpdate = { fishAudioApiKeyEnc: null }
    } else if (fishAudioApiKey !== undefined) {
      const raw = typeof fishAudioApiKey === 'string' ? fishAudioApiKey.trim() : ''
      if (raw) fishKeyUpdate = { fishAudioApiKeyEnc: encrypt(raw) }
    }

    let fishVoicesValue: string | undefined
    if (fishAudioVoices !== undefined) {
      if (!Array.isArray(fishAudioVoices)) {
        return NextResponse.json({ error: 'fishAudioVoices debe ser un array' }, { status: 400 })
      }
      fishVoicesValue = JSON.stringify(parseFishVoiceCatalog(JSON.stringify(fishAudioVoices)))
    }

    const ttsData = {
      ...(providerValue ? { ttsProvider: providerValue } : {}),
      ...(fishKeyUpdate || {}),
      ...(fishAudioModel !== undefined ? { fishAudioModel: validFishAudioModel(String(fishAudioModel)) } : {}),
      ...(fishAudioReferenceId !== undefined
        ? { fishAudioReferenceId: String(fishAudioReferenceId).trim().slice(0, 191) || null }
        : {}),
      ...(fishVoicesValue !== undefined ? { fishAudioVoices: fishVoicesValue } : {}),
      ...(fishAudioDirection !== undefined
        ? { fishAudioDirection: String(fishAudioDirection).trim().slice(0, 500) || null }
        : {}),
    }

    const sitesData = {
      ...(clientSitesDomain !== undefined ? { clientSitesDomain: clientSitesDomain?.trim() || null } : {}),
      ...(clientSitesTarget !== undefined ? { clientSitesTarget: clientSitesTarget?.trim() || null } : {}),
      ...(clientSitesIp !== undefined ? { clientSitesIp: clientSitesIp?.trim() || null } : {}),
      ...(tokenUpdate || {}),
    }

    let config = await prisma.appConfig.findFirst()
    if (!config) {
      config = await prisma.appConfig.create({
        data: {
          enableGenericNews: enableGenericNews ?? false,
          adminNotifyEmail: adminNotifyEmail ?? null,
          ...(trialDaysValue !== undefined ? { trialDays: trialDaysValue } : {}),
          ...panelLogoData,
          ...sitesData,
          ...elevenLabsData,
          ...ttsData,
        },
      })
    } else {
      config = await prisma.appConfig.update({
        where: { id: config.id },
        data: {
          ...(enableGenericNews !== undefined ? { enableGenericNews } : {}),
          ...(adminNotifyEmail !== undefined ? { adminNotifyEmail: adminNotifyEmail || null } : {}),
          ...(trialDaysValue !== undefined ? { trialDays: trialDaysValue } : {}),
          ...panelLogoData,
          ...sitesData,
          ...elevenLabsData,
          ...ttsData,
        },
      })
    }

    invalidateClientSitesConfig()
    invalidateElevenLabsConfig()
    invalidateFishAudioConfig()
    const eleven = await getElevenLabsConfig()
    const fish = await getFishAudioConfig()

    return NextResponse.json({
      enableGenericNews: config.enableGenericNews,
      adminNotifyEmail: config.adminNotifyEmail,
      trialDays: config.trialDays,
      panelLogoDarkUrl: config.panelLogoDarkUrl || '',
      panelLogoLightUrl: config.panelLogoLightUrl || '',
      panelFaviconUrl: config.panelFaviconUrl || '',
      clientSitesDomain: config.clientSitesDomain || process.env.CLIENT_SITES_DOMAIN || '',
      clientSitesTarget: config.clientSitesTarget || process.env.CLIENT_SITES_TARGET || '',
      clientSitesIp: config.clientSitesIp || process.env.CLIENT_SITES_IP || '',
      cloudflareTokenSet: Boolean(config.cloudflareApiTokenEnc || process.env.CLOUDFLARE_API_TOKEN),
      elevenLabsKeySet: Boolean(eleven.apiKey),
      elevenLabsVoiceId: eleven.voiceId,
      elevenLabsModel: eleven.model,
      elevenLabsEnabled: eleven.enabled,
      ttsCacheEnabled: eleven.cacheEnabled,
      elevenLabsVoices: parseVoiceCatalog(config.elevenLabsVoices),
      ttsQualityPreset: eleven.qualityPreset,
      pronunciationDictionaryId: eleven.pronunciationDictionaryId || '',
      pronunciationDictionaryVersionId: eleven.pronunciationDictionaryVersionId || '',
      ttsProvider: config.ttsProvider === 'fish' ? 'fish' : 'elevenlabs',
      fishAudioKeySet: Boolean(fish.apiKey),
      fishAudioModel: fish.model,
      fishAudioReferenceId: fish.referenceId,
      fishAudioVoices: fish.voices,
      fishAudioDirection: fish.direction,
    })
  } catch (error) {
    console.error('Error updating app config:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
