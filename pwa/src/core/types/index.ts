export interface ClientInfo {
  id: string
  name: string
}

export interface GcBarMessage {
  id: string
  text: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface FullClientData {
  client: ClientInfo
  selectedTemplate: string | null
  accentColor?: string | null
  oneSignalAppId: string | null
  basicData: BasicData | null
  socialNetworks: SocialNetworks | null
  programs: Program[]
  news: News[]
  videos: Video[]
  sponsors: Sponsor[]
  galleries: Gallery[]
  announcers: Announcer[]
  polls: Poll[]
  events: EventItem[]
  promotions: Promotion[]
  podcasts: Podcast[]
  videocasts: Videocast[]
  gcBar?: GcBarMessage[]
}

export interface BasicLocation {
  city?: string | null
  region?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface BasicData {
  projectName: string
  projectDescription: string
  logoUrl: string | null
  coverUrl: string | null
  websiteUrl: string | null
  radioStreamingUrl: string | null
  videoStreamingUrl: string | null
  location?: BasicLocation | null
  createdAt: string
  updatedAt: string
}

export interface SocialNetworks {
  facebook: string | null
  youtube: string | null
  instagram: string | null
  tiktok: string | null
  whatsapp: string | null
  x: string | null
  createdAt: string
  updatedAt: string
}

export type StreamingStatusValue = 'off' | 'autodj' | 'live'

export interface StreamingTrack {
  title: string
  artist: string
  album: string | null
  coverUrl: string | null
  duration: number | null
  elapsed?: number
  isJingle: boolean
}

export interface StreamingJingleConfig {
  playEvery: number
  playCount: number
}

export interface StreamingPosition {
  index: number
  total: number
}

export interface Streaming {
  clientId: string
  clientName: string
  mount: string | null
  streamUrl: string
  bitrate: number | null
  status: StreamingStatusValue
  isLive: boolean
  listeners: number
  listenerPeak: number
  jingleConfig: StreamingJingleConfig | null
  currentTrack: StreamingTrack | null
  nextTrack: StreamingTrack | null
  position: StreamingPosition | null
  lastUpdate: string
}

export interface StreamingStatus {
  clientId: string
  clientName: string
  mount: string | null
  bitrate: number | null
  status: StreamingStatusValue
  isLive: boolean
  listeners: number
  listenerPeak: number
  currentTitle: string | null
  currentArtist: string | null
  currentCoverUrl: string | null
  streamUrls: Record<string, string>
  lastUpdate: string
}

export interface Program {
  id: string
  name: string
  imageUrl: string | null
  description: string
  startTime: string
  endTime: string
  weekDays: number[]
  createdAt: string
  updatedAt: string
}

export interface NewsCategory {
  id: string
  name: string
  slug: string
}

export type NewsSource = 'own' | 'generic'

export interface News {
  id: string
  name: string
  slug: string
  shortText: string
  longText: string
  imageUrl: string | null
  category?: NewsCategory
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasMore?: boolean
  totalPages?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
  source: NewsSource
}

export interface Video {
  id: string
  name: string
  videoUrl: string | null
  description: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface Sponsor {
  id: string
  name: string
  logoUrl: string | null
  address: string | null
  description: string
  facebook: string | null
  youtube: string | null
  instagram: string | null
  tiktok: string | null
  whatsapp: string | null
  x: string | null
  website: string | null
  createdAt: string
  updatedAt: string
}

export interface GalleryImage {
  id: string
  imageUrl: string
  order: number
}

export interface Gallery {
  id: string
  title: string
  description: string
  images: GalleryImage[]
  createdAt: string
  updatedAt: string
}

export interface Announcer {
  id: string
  name: string
  description: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface EventItem {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string | null
  eventUrl: string | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface Promotion {
  id: string
  title: string
  description: string
  imageUrl: string | null
  link: string | null
  createdAt: string
  updatedAt: string
}

export interface Podcast {
  id: string
  title: string
  description: string
  imageUrl: string | null
  audioUrl: string | null
  duration: number | null
  episodeNumber: number | null
  season: number | null
  createdAt: string
  updatedAt: string
}

export interface Videocast {
  id: string
  title: string
  description: string
  imageUrl: string | null
  videoUrl: string | null
  duration: number | null
  episodeNumber: number | null
  season: number | null
  createdAt: string
  updatedAt: string
}

export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface Poll {
  id: string
  title: string
  active: boolean
  options: PollOption[]
  createdAt: string
  updatedAt: string
}

export type ChatAuthorType = 'listener' | 'admin'

export interface ChatMessage {
  id: string
  authorType: ChatAuthorType
  name: string
  body: string
  email: string | null
  createdAt: string
}

export interface ChatMessagesResponse {
  messages: ChatMessage[]
  serverTime: string
  retentionHours: number
}

export interface ChatOnlineResponse {
  count: number
  recentNames: string[]
}

export interface PwaRegisterResponse {
  registered: boolean
  total: number
  firstTime: boolean
}
