import { z } from 'zod'

// Validación para datos básicos
export const basicDataLocationSchema = z.object({
  city: z.string().min(1, 'La ciudad es requerida'),
  region: z.string().nullable().optional(),
  country: z.string().length(2, 'El país debe ser un código ISO de 2 letras'),
  latitude: z.number().min(-90).max(90, 'Latitud inválida'),
  longitude: z.number().min(-180).max(180, 'Longitud inválida'),
})

export const basicDataSchema = z.object({
  projectName: z.string().min(1, 'El nombre del proyecto es requerido'),
  projectDescription: z.string().min(1, 'La descripción es requerida'),
  logoUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  websiteUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  radioStreamingUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  videoStreamingUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  location: basicDataLocationSchema.nullable().optional(),
})

// Validación para redes sociales
export const socialNetworksSchema = z.object({
  facebook: z.string().url('URL inválida').optional().or(z.literal('')),
  youtube: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram: z.string().url('URL inválida').optional().or(z.literal('')),
  tiktok: z.string().url('URL inválida').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  x: z.string().url('URL inválida').optional().or(z.literal('')),
})

// Validación para programas
export const programSchema = z.object({
  name: z.string().min(1, 'El nombre del programa es requerido'),
  imageUrl: z.string().optional(),
  description: z.string().min(1, 'La descripción es requerida'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  weekDays: z.array(z.string()).min(1, 'Selecciona al menos un día'),
})

// Validación para noticias
export const newsSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  shortText: z.string().min(1, 'El texto corto es requerido'),
  longText: z.string().min(1, 'El texto largo es requerido'),
  imageUrl: z.string().optional(),
})

// Validación para ranking de videos
export const rankingVideoSchema = z.object({
  name: z.string().min(1, 'El nombre del video es requerido'),
  videoUrl: z.string().url('URL del video inválida'),
  description: z.string().min(1, 'La descripción es requerida'),
})

// Validación para auspiciadores
export const sponsorSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  description: z.string().min(1, 'La descripción es requerida'),
  facebook: z.string().url('URL inválida').optional().or(z.literal('')),
  youtube: z.string().url('URL inválida').optional().or(z.literal('')),
  instagram: z.string().url('URL inválida').optional().or(z.literal('')),
  tiktok: z.string().url('URL inválida').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  x: z.string().url('URL inválida').optional().or(z.literal('')),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
})

// Validación para promociones
export const promotionSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  imageUrl: z.string().optional(),
  link: z.string().url('URL inválida').optional().or(z.literal('')),
})

// Validación para podcasts (solo audio)
export const podcastSchema = z.object({
  title: z.string().min(1, 'El título del episodio es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  imageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  duration: z.string().optional(),
  episodeNumber: z.number().int().positive().optional(),
  season: z.string().optional(),
})

// Validación para videocasts (solo video)
export const videocastSchema = z.object({
  title: z.string().min(1, 'El título del episodio es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  imageUrl: z.string().optional(),
  videoUrl: z.string().url('URL inválida').min(1, 'La URL de YouTube es requerida'),
  duration: z.string().optional(),
  episodeNumber: z.number().int().positive().optional(),
  season: z.string().optional(),
})

// Validación para autenticación
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  planId: z.string().optional().transform((v) => v?.trim() || undefined),
})

export type BasicDataInput = z.infer<typeof basicDataSchema>
export type SocialNetworksInput = z.infer<typeof socialNetworksSchema>
export type ProgramInput = z.infer<typeof programSchema>
export type NewsInput = z.infer<typeof newsSchema>
export type RankingVideoInput = z.infer<typeof rankingVideoSchema>
export type SponsorInput = z.infer<typeof sponsorSchema>
export type PromotionInput = z.infer<typeof promotionSchema>
export type PodcastInput = z.infer<typeof podcastSchema>
export type VideocastInput = z.infer<typeof videocastSchema>

// Validación para galerías
export const gallerySchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  imageUrls: z.array(z.string()).min(1, 'Agrega al menos una imagen'),
})

export type GalleryInput = z.infer<typeof gallerySchema>

export const announcerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  imageUrl: z.string().optional(),
})

export type AnnouncerInput = z.infer<typeof announcerSchema>

export const pollSchema = z.object({
  title: z.string().min(1, 'El título de la encuesta es requerido'),
  options: z.array(z.string().min(1, 'Cada opción debe tener texto')).min(2, 'Agrega al menos 2 opciones'),
})

export type PollInput = z.infer<typeof pollSchema>

export const eventSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  date: z.string().min(1, 'La fecha es requerida'),
  time: z.string().optional(),
  location: z.string().optional(),
  eventUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  imageUrl: z.string().optional(),
})

export const globalNewsCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
})

export const globalNewsSchema = z.object({
  categoryId: z.string().min(1, 'La categoría es requerida'),
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  shortText: z.string().min(1, 'El texto corto es requerido'),
  longText: z.string().min(1, 'El texto largo es requerido'),
  imageUrl: z.string().optional(),
})

export const aiGenerateSchema = z.object({
  categoryIds: z.array(z.string().min(1)).min(1, 'Selecciona al menos una categoría').max(10),
  countPerCategory: z.number().int().min(1).max(5).default(3),
})

export const aiApproveBatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Selecciona al menos un borrador').max(50),
})

export const tutorialCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(1000).optional().nullable(),
  order: z.number().int().min(0).default(0),
})

export const tutorialSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  description: z.string().max(2000).optional().nullable(),
  youtubeUrl: z.string().min(1, 'La URL de YouTube es requerida').max(500),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  order: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
})

export const supportTicketSchema = z.object({
  subject: z.string().min(5, 'El asunto es muy corto').max(200, 'Máximo 200 caracteres'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  body: z.string().min(10, 'El mensaje es muy corto').max(5000, 'Máximo 5000 caracteres'),
  attachmentIds: z.array(z.string()).max(5).optional().default([]),
})

export const supportTicketMessageSchema = z.object({
  body: z.string().min(1, 'El mensaje no puede estar vacío').max(5000, 'Máximo 5000 caracteres'),
  attachmentIds: z.array(z.string()).max(5).optional().default([]),
  notifyByEmail: z.boolean().optional().default(true),
})

export const supportTicketUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
})

// Validación para mensajes del chat (oyentes)
export const chatMessageSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto').max(60, 'Máximo 60 caracteres').trim(),
  email: z.string().email('Email inválido').max(120, 'Máximo 120 caracteres').trim().toLowerCase(),
  body: z.string().min(1, 'El mensaje no puede estar vacío').max(500, 'Máximo 500 caracteres').trim(),
})

// Validación para mensajes del chat (staff, desde el dashboard)
export const chatStaffMessageSchema = z.object({
  body: z.string().min(1, 'El mensaje no puede estar vacío').max(500, 'Máximo 500 caracteres').trim(),
})

// Validación para bans del chat
export const chatBanSchema = z.object({
  email: z.string().email('Email inválido').max(120).trim().toLowerCase().optional().nullable(),
  ipAddress: z.string().max(45).optional().nullable(),
  reason: z.string().max(200).optional().nullable(),
}).refine(
  (data) => !!data.email || !!data.ipAddress,
  { message: 'Debe especificar email o IP' }
)

export type ChatMessageInput = z.infer<typeof chatMessageSchema>
export type ChatStaffMessageInput = z.infer<typeof chatStaffMessageSchema>
export type ChatBanInput = z.infer<typeof chatBanSchema>

export type EventInput = z.infer<typeof eventSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type GlobalNewsCategoryInput = z.infer<typeof globalNewsCategorySchema>
export type GlobalNewsInput = z.infer<typeof globalNewsSchema>
export type AiGenerateInput = z.infer<typeof aiGenerateSchema>
export type AiApproveBatchInput = z.infer<typeof aiApproveBatchSchema>

// =====================================================
// Streaming (Phase 4)
// =====================================================

export const streamingPlaylistCreateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(1000).optional(),
  shuffle: z.boolean().optional(),
  repeat: z.boolean().optional(),
})
export type StreamingPlaylistCreateInput = z.infer<typeof streamingPlaylistCreateSchema>

export const streamingPlaylistUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  shuffle: z.boolean().optional(),
  repeat: z.boolean().optional(),
})
export type StreamingPlaylistUpdateInput = z.infer<typeof streamingPlaylistUpdateSchema>

export const streamingTrackAddSchema = z.object({
  trackId: z.string().min(1),
})
export type StreamingTrackAddInput = z.infer<typeof streamingTrackAddSchema>

export const streamingReorderSchema = z.object({
  trackIds: z.array(z.string().min(1)).min(1, 'trackIds no puede estar vacío'),
})
export type StreamingReorderInput = z.infer<typeof streamingReorderSchema>

export const streamingTrackUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  artist: z.string().max(200).nullable().optional(),
  album: z.string().max(200).nullable().optional(),
})
export type StreamingTrackUpdateInput = z.infer<typeof streamingTrackUpdateSchema>

// =====================================================
// Streaming Admin (Phase 7)
// =====================================================

export const streamingAdminConfigSchema = z.object({
  enabled: z.boolean().optional(),
  autoStart: z.boolean().optional(),
  bitrate: z.number().int().min(32).max(320).optional(),
  storageQuotaMB: z.number().int().min(0).max(1024 * 1024).nullable().optional(),  // max 1TB
  maxListeners: z.number().int().min(0).max(100000).nullable().optional(),
  maxTracksPerPlaylist: z.number().int().min(1).max(10000).nullable().optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
})
export type StreamingAdminConfigInput = z.infer<typeof streamingAdminConfigSchema>

// =====================================================
// Servidores de Streaming (multi-servidor)
// =====================================================

export const streamingServerCreateSchema = z.object({
  name: z.string().min(1).max(191),
  type: z.enum(['radio', 'tv', 'both']),
  baseUrl: z.string().url().max(500),
  token: z.string().min(1).max(500),
  publicHostname: z.string().min(1).max(191),
  publicUrl: z.string().url().max(500).optional(),
})
export type StreamingServerCreateInput = z.infer<typeof streamingServerCreateSchema>

export const streamingServerUpdateSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  type: z.enum(['radio', 'tv', 'both']).optional(),
  baseUrl: z.string().url().max(500).optional(),
  token: z.string().min(1).max(500).optional(),
  publicHostname: z.string().min(1).max(191).optional(),
  publicUrl: z.string().url().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  revokeSsh: z.boolean().optional(),
})
export type StreamingServerUpdateInput = z.infer<typeof streamingServerUpdateSchema>

// Provisioning automático de nodos (SSH desde el panel)
export const streamingServerProvisionSchema = z.object({
  name: z.string().min(1).max(191),
  type: z.enum(['radio', 'tv', 'both']),
  publicHostname: z.string().min(1).max(191),
  sshHost: z.string().min(1).max(191),
  sshPort: z.number().int().min(1).max(65535).optional().default(22),
  sshUser: z.string().min(1).max(191).optional().default('root'),
  sshAuthType: z.enum(['key', 'password']).optional().default('key'),
  sshPrivateKey: z.string().min(1).optional(),
  sshPassword: z.string().min(1).optional(),
})
export type StreamingServerProvisionInput = z.infer<typeof streamingServerProvisionSchema>

// =====================================================
// Email (Resend) — plantillas y envío
// =====================================================

export const emailTemplateSchema = z.object({
  key: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(191),
  description: z.string().max(5000).nullable().optional(),
  subject: z.string().min(1).max(191),
  htmlBody: z.string().min(1),
  isActive: z.boolean().optional().default(true),
})
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>

export const emailSendSchema = z.object({
  recipientType: z.enum(['single', 'selected', 'all']),
  clientIds: z.array(z.string()).optional(),
  templateKey: z.string().optional(),
  subject: z.string().max(191).optional(),
  html: z.string().optional(),
  attachBoleta: z.boolean().optional(),
  test: z.boolean().optional(),
})
export type EmailSendInput = z.infer<typeof emailSendSchema>