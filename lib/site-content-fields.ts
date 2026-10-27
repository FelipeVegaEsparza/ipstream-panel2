import type { SiteContentLocale } from './site-content'

export type SiteFieldKind = 'text' | 'textarea' | 'lines' | 'url' | 'email' | 'image' | 'audio'

export interface SiteI18nField {
  key: string
  label: string
  kind?: SiteFieldKind
  help?: string
}

export interface SiteGlobalField {
  path: string
  label: string
  kind?: SiteFieldKind
}

export interface SiteCollectionField {
  path: string
  label: string
  kind?: SiteFieldKind
  help?: string
}

export type SiteCollectionKey =
  | 'pillars'
  | 'highlights'
  | 'aiFeatures'
  | 'aiSteps'
  | 'studioFeatures'
  | 'players'
  | 'supportCards'
  | 'faq'
  | 'proFeatures'
  | 'voiceSamples'

export interface SiteCollectionConfig {
  key: SiteCollectionKey
  label: string
  itemLabel: string
  fields: SiteCollectionField[]
  create: () => Record<string, unknown>
}

export interface SiteContentTab {
  id: string
  labelKey: string
  i18nFields: SiteI18nField[]
  globalFields?: SiteGlobalField[]
  collectionKeys?: SiteCollectionKey[]
}

const f = (key: string, label: string, kind: SiteFieldKind = 'text'): SiteI18nField => ({
  key,
  label,
  kind,
})
const g = (path: string, label: string, kind: SiteFieldKind = 'text'): SiteGlobalField => ({
  path,
  label,
  kind,
})
const cf = (
  path: string,
  label: string,
  kind: SiteFieldKind = 'text',
  help?: string
): SiteCollectionField => ({ path, label, kind, help })

export const SITE_COLLECTIONS: Record<SiteCollectionKey, SiteCollectionConfig> = {
  pillars: {
    key: 'pillars',
    label: 'Pilares de la plataforma',
    itemLabel: 'Pilar',
    create: () => ({ code: '', title: 'Nuevo pilar', description: '', points: [], image: '', icon: 'dashboard' }),
    fields: [
      cf('code', 'Código'),
      cf('title', 'Título'),
      cf('description', 'Descripción', 'textarea'),
      cf('points', 'Puntos', 'lines', 'Un punto por línea'),
      cf('image', 'Imagen', 'image'),
      cf('icon', 'Icono'),
    ],
  },
  highlights: {
    key: 'highlights',
    label: 'Funcionalidades destacadas',
    itemLabel: 'Funcionalidad',
    create: () => ({ code: '', title: 'Nueva funcionalidad', description: '', points: [], icon: 'play' }),
    fields: [
      cf('code', 'Código'),
      cf('title', 'Título'),
      cf('description', 'Descripción', 'textarea'),
      cf('points', 'Puntos', 'lines', 'Un punto por línea'),
      cf('icon', 'Icono'),
    ],
  },
  aiFeatures: {
    key: 'aiFeatures',
    label: 'Funciones de IA',
    itemLabel: 'Función IA',
    create: () => ({ code: '', title: 'Nueva función IA', description: '', points: [], icon: 'mic' }),
    fields: [
      cf('code', 'Código'),
      cf('title', 'Título'),
      cf('description', 'Descripción', 'textarea'),
      cf('points', 'Puntos', 'lines', 'Un punto por línea'),
      cf('icon', 'Icono'),
    ],
  },
  aiSteps: {
    key: 'aiSteps',
    label: 'Pasos de IA',
    itemLabel: 'Paso',
    create: () => ({ code: '', title: 'Nuevo paso', description: '' }),
    fields: [cf('code', 'Código'), cf('title', 'Título'), cf('description', 'Descripción', 'textarea')],
  },
  studioFeatures: {
    key: 'studioFeatures',
    label: 'Funciones de Studio',
    itemLabel: 'Función de Studio',
    create: () => ({ code: '', title: 'Nueva función', description: '', points: [] }),
    fields: [
      cf('code', 'Código'),
      cf('title', 'Título'),
      cf('description', 'Descripción', 'textarea'),
      cf('points', 'Puntos', 'lines', 'Un punto por línea'),
    ],
  },
  players: {
    key: 'players',
    label: 'Reproductores',
    itemLabel: 'Reproductor',
    create: () => ({ title: 'Nuevo reproductor', description: '', tags: [], image: '' }),
    fields: [
      cf('title', 'Título'),
      cf('description', 'Descripción', 'textarea'),
      cf('tags', 'Etiquetas', 'lines', 'Una etiqueta por línea'),
      cf('image', 'Imagen', 'image'),
    ],
  },
  supportCards: {
    key: 'supportCards',
    label: 'Tarjetas de soporte',
    itemLabel: 'Tarjeta de soporte',
    create: () => ({ title: 'Nuevo acceso', description: '', href: '', action: 'Abrir' }),
    fields: [
      cf('title', 'Título'),
      cf('description', 'Descripción', 'textarea'),
      cf('href', 'Enlace'),
      cf('action', 'Texto del enlace'),
    ],
  },
  faq: {
    key: 'faq',
    label: 'Preguntas frecuentes',
    itemLabel: 'Pregunta',
    create: () => ({ question: 'Nueva pregunta', answer: '' }),
    fields: [cf('question', 'Pregunta'), cf('answer', 'Respuesta', 'textarea')],
  },
  proFeatures: {
    key: 'proFeatures',
    label: 'Operación profesional',
    itemLabel: 'Característica',
    create: () => ({ icon: 'mic', title: 'Nueva característica', text: '' }),
    fields: [cf('icon', 'Icono'), cf('title', 'Título'), cf('text', 'Texto', 'textarea')],
  },
  voiceSamples: {
    key: 'voiceSamples',
    label: 'Ejemplos de locución',
    itemLabel: 'Locución',
    create: () => ({
      title: 'Nueva locución',
      description: '',
      voice: '',
      tag: 'IA',
      duration: '',
      audioUrl: '',
      transcript: '',
    }),
    fields: [
      cf('title', 'Título'),
      cf('description', 'Descripción', 'textarea'),
      cf('voice', 'Voz'),
      cf('tag', 'Etiqueta'),
      cf('duration', 'Duración'),
      cf('audioUrl', 'Audio', 'audio'),
      cf('transcript', 'Transcripción', 'textarea'),
    ],
  },
}

export const SITE_CONTENT_TABS: SiteContentTab[] = [
  {
    id: 'general',
    labelKey: 'admin.siteContent.tabGeneral',
    globalFields: [
      g('siteName', 'Nombre del sitio'),
      g('tagline', 'Tagline'),
      g('contactEmail', 'Email de contacto', 'email'),
      g('panelUrl', 'URL del panel', 'url'),
      g('demoStreamUrl', 'URL del stream de demo', 'url'),
    ],
    i18nFields: [
      f('home.metaTitle', 'Título SEO de la home'),
      f('home.metaDescription', 'Descripción SEO de la home', 'textarea'),
    ],
  },
  {
    id: 'home',
    labelKey: 'admin.siteContent.tabHome',
    i18nFields: [
      f('home.hero.badge', 'Badge del hero'),
      f('home.hero.title', 'Título del hero'),
      f('home.hero.description', 'Descripción del hero', 'textarea'),
      f('home.hero.ctaAI', 'CTA principal'),
      f('home.hero.ctaPlans', 'CTA secundario'),
      f('home.hero.aiKicker', 'Kicker del módulo IA'),
      f('home.hero.aiTitle', 'Título del módulo IA'),
      f('home.hero.aiItem1', 'Item IA 1'),
      f('home.hero.aiItem2', 'Item IA 2'),
      f('home.hero.aiItem3', 'Item IA 3'),
      f('home.hero.aiItem4', 'Item IA 4'),
      f('home.ai.eyebrow', 'Eyebrow Sección IA'),
      f('home.ai.title', 'Título Sección IA'),
      f('home.ai.description', 'Descripción Sección IA', 'textarea'),
      f('home.ai.cta', 'CTA Sección IA'),
      f('home.platform.eyebrow', 'Eyebrow Plataforma'),
      f('home.platform.title', 'Título Plataforma'),
      f('home.platform.description', 'Descripción Plataforma', 'textarea'),
      f('home.highlights.eyebrow', 'Eyebrow Funcionalidades'),
      f('home.highlights.title', 'Título Funcionalidades'),
      f('home.plans.eyebrow', 'Eyebrow Planes'),
      f('home.plans.title', 'Título Planes'),
      f('home.clients.eyebrow', 'Eyebrow Clientes'),
      f('home.clients.title', 'Título Clientes'),
      f('home.clients.aria', 'Aria Clientes'),
      f('home.news.eyebrow', 'Eyebrow Noticias'),
      f('home.news.title', 'Título Noticias'),
      f('home.news.viewAll', 'Texto ver todas'),
      f('home.cta.eyebrow', 'Eyebrow CTA final'),
      f('home.cta.title', 'Título CTA final'),
      f('home.cta.plans', 'CTA planes'),
      f('home.cta.contact', 'CTA contacto'),
      f('home.aiPlan.eyebrow', 'Eyebrow nota plan IA'),
      f('home.aiPlan.characters', 'Texto caracteres del plan IA'),
      f('home.aiPlan.cta', 'CTA nota plan IA'),
      f('home.demo.eyebrow', 'Eyebrow demo de audio'),
      f('home.demo.title', 'Título demo de audio'),
      f('home.demo.description', 'Descripción demo de audio', 'textarea'),
      f('home.demo.station', 'Nombre de la estación demo'),
      f('home.demo.meta', 'Metadatos demo'),
      f('home.demo.play', 'Texto play'),
      f('home.demo.pause', 'Texto pausa'),
      f('home.demo.connecting', 'Texto conectando'),
      f('home.demo.error', 'Texto error'),
      f('home.demo.open', 'Texto abrir stream'),
      f('home.demo.live', 'Badge en vivo'),
      f('home.demo.aria', 'Aria del reproductor demo'),
    ],
  },
  {
    id: 'ia',
    labelKey: 'admin.siteContent.tabIa',
    i18nFields: [
      f('ia.metaTitle', 'Título SEO IA'),
      f('ia.metaDescription', 'Descripción SEO IA', 'textarea'),
      f('ia.hero.eyebrow', 'Eyebrow hero IA'),
      f('ia.hero.title', 'Título hero IA'),
      f('ia.hero.description', 'Descripción hero IA', 'textarea'),
      f('ia.hero.ctaPlans', 'CTA planes'),
      f('ia.hero.ctaFeatures', 'CTA características'),
      f('ia.console.label', 'Label consola'),
      f('ia.console.onAir', 'Badge on air'),
      f('ia.console.title', 'Título consola'),
      f('ia.console.item1', 'Item consola 1'),
      f('ia.console.item2', 'Item consola 2'),
      f('ia.console.item3', 'Item consola 3'),
      f('ia.console.item4', 'Item consola 4'),
      f('ia.console.characters', 'Texto caracteres'),
      f('ia.console.music', 'Texto minutos de música'),
      f('ia.features.eyebrow', 'Eyebrow funciones'),
      f('ia.features.title', 'Título funciones'),
      f('ia.features.description', 'Descripción funciones', 'textarea'),
      f('ia.steps.eyebrow', 'Eyebrow pasos'),
      f('ia.steps.title', 'Título pasos'),
      f('ia.pro.eyebrow', 'Eyebrow operación'),
      f('ia.pro.title', 'Título operación'),
      f('ia.pro.description', 'Descripción operación', 'textarea'),
      f('ia.pro.moduleLabel', 'Label módulo'),
      f('ia.pro.kicker', 'Kicker módulo'),
      f('ia.pro.moduleTitle', 'Título módulo'),
      f('ia.pro.moduleDescription', 'Descripción módulo', 'textarea'),
      f('ia.pro.tag1', 'Tag 1'),
      f('ia.pro.tag2', 'Tag 2'),
      f('ia.pro.tag3', 'Tag 3'),
      f('ia.pro.tag4', 'Tag 4'),
      f('ia.pro.cta', 'CTA operación'),
      f('ia.plans.eyebrow', 'Eyebrow planes IA'),
      f('ia.plans.title', 'Título planes IA'),
      f('ia.plans.description', 'Descripción planes IA', 'textarea'),
      f('ia.plans.planFallback', 'Nombre plan fallback'),
      f('ia.plans.planDescription', 'Descripción plan'),
      f('ia.plans.characters', 'Texto caracteres'),
      f('ia.plans.music', 'Texto música'),
      f('ia.plans.cta', 'CTA planes IA'),
      f('ia.cta.eyebrow', 'Eyebrow CTA IA'),
      f('ia.cta.title', 'Título CTA IA'),
      f('ia.cta.description', 'Descripción CTA IA', 'textarea'),
      f('ia.cta.button', 'Botón CTA IA'),
      f('home.voice.eyebrow', 'Eyebrow sección locuciones'),
      f('home.voice.title', 'Título sección locuciones'),
      f('home.voice.description', 'Descripción sección locuciones', 'textarea'),
      f('home.voice.play', 'Texto reproducir'),
      f('home.voice.pause', 'Texto pausar'),
      f('home.voice.aria', 'Aria sección locuciones'),
    ],
    collectionKeys: ['aiFeatures', 'aiSteps', 'proFeatures', 'voiceSamples'],
  },
  {
    id: 'platform',
    labelKey: 'admin.siteContent.tabPlatform',
    i18nFields: [
      f('features.metaTitle', 'Título SEO características'),
      f('features.metaDescription', 'Descripción SEO características', 'textarea'),
      f('features.hero.eyebrow', 'Eyebrow hero características'),
      f('features.hero.title', 'Título hero características'),
      f('features.hero.description', 'Descripción hero características', 'textarea'),
      f('features.ai.eyebrow', 'Eyebrow IA'),
      f('features.ai.title', 'Título IA'),
      f('features.ai.description', 'Descripción IA', 'textarea'),
      f('features.base.eyebrow', 'Eyebrow base'),
      f('features.base.title', 'Título base'),
      f('features.highlights.eyebrow', 'Eyebrow destacadas'),
      f('features.highlights.title', 'Título destacadas'),
      f('features.cta.title', 'Título CTA'),
      f('features.cta.button', 'Botón CTA'),
    ],
    collectionKeys: ['pillars', 'highlights'],
  },
  {
    id: 'studio',
    labelKey: 'admin.siteContent.tabStudio',
    i18nFields: [
      f('home.studio.eyebrow', 'Eyebrow Studio'),
      f('home.studio.title', 'Título Studio'),
      f('home.studio.description', 'Descripción Studio', 'textarea'),
      f('home.studio.alt', 'Texto alternativo imagen'),
      f('home.studio.live', 'Texto en vivo'),
      f('home.studio.bitrate', 'Texto bitrate'),
      f('home.studio.effects', 'Texto efectos'),
      f('home.studio.aiVoice', 'Texto locutor IA'),
      f('features.studio.eyebrow', 'Eyebrow Studio características'),
      f('features.studio.title', 'Título Studio características'),
      f('features.studio.description', 'Descripción Studio características', 'textarea'),
    ],
    collectionKeys: ['studioFeatures'],
  },
  {
    id: 'chat',
    labelKey: 'admin.siteContent.tabChat',
    i18nFields: [
      f('home.chat.eyebrow', 'Eyebrow chat'),
      f('home.chat.title', 'Título chat'),
      f('home.chat.description', 'Descripción chat', 'textarea'),
      f('home.chat.demoAria', 'Aria demo'),
      f('home.chat.demoTitle', 'Título demo'),
      f('home.chat.demoOnline', 'Texto oyentes'),
      f('home.chat.demoStaff', 'Nombre staff'),
      f('home.chat.demoMsg1', 'Mensaje demo 1'),
      f('home.chat.demoMsg2', 'Mensaje demo 2'),
      f('home.chat.demoMsg3', 'Mensaje demo 3'),
      f('home.chat.demoInput', 'Placeholder input'),
      f('home.chat.demoSend', 'Texto enviar'),
    ],
  },
  {
    id: 'players',
    labelKey: 'admin.siteContent.tabPlayers',
    i18nFields: [
      f('home.players.eyebrow', 'Eyebrow reproductores'),
      f('home.players.title', 'Título reproductores'),
      f('home.players.description', 'Descripción reproductores', 'textarea'),
      f('features.players.eyebrow', 'Eyebrow reproductores características'),
      f('features.players.title', 'Título reproductores características'),
    ],
    collectionKeys: ['players'],
  },
  {
    id: 'faq',
    labelKey: 'admin.siteContent.tabFaq',
    collectionKeys: ['faq', 'supportCards'],
    i18nFields: [],
  },
  {
    id: 'seo',
    labelKey: 'admin.siteContent.tabSeo',
    i18nFields: [
      f('plans.metaTitle', 'Título SEO planes'),
      f('plans.metaDescription', 'Descripción SEO planes', 'textarea'),
      f('clients.metaTitle', 'Título SEO clientes'),
      f('clients.metaDescription', 'Descripción SEO clientes', 'textarea'),
      f('tutorials.metaTitle', 'Título SEO tutoriales'),
      f('tutorials.metaDescription', 'Descripción SEO tutoriales', 'textarea'),
      f('news.metaTitle', 'Título SEO noticias'),
      f('news.metaDescription', 'Descripción SEO noticias', 'textarea'),
      f('footer.description', 'Descripción del footer', 'textarea'),
    ],
  },
  {
    id: 'contact',
    labelKey: 'admin.siteContent.tabContact',
    globalFields: [
      g('social.facebook', 'Facebook', 'url'),
      g('social.youtube', 'YouTube', 'url'),
      g('social.instagram', 'Instagram', 'url'),
      g('social.tiktok', 'TikTok', 'url'),
      g('social.twitter', 'X / Twitter', 'url'),
    ],
    i18nFields: [
      f('contact.eyebrow', 'Eyebrow contacto'),
      f('contact.title', 'Título contacto'),
      f('contact.description', 'Descripción contacto', 'textarea'),
      f('contact.email', 'Label email'),
      f('contact.panel', 'Label panel'),
      f('contact.loginPanel', 'Texto ingresar al panel'),
      f('contact.submit', 'Texto botón enviar'),
    ],
  },
]
