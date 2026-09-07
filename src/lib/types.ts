export type MediaType = 'film' | 'tv_show' | 'tv_season' | 'game' | 'book' | 'album'

// What the search box can look up — tv_season items are created by drilling
// into a tv_show result, never searched directly.
export type SearchType = Exclude<MediaType, 'tv_season'>

export type LogStatus = 'done' | 'in_progress' | 'abandoned'

export interface MediaItem {
  id: string
  media_type: MediaType
  parent_id: string | null
  external_source: string
  external_id: string
  title: string
  year: number | null
  creator: string | null
  cover_url: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LogEntry {
  id: string
  item_id: string
  user_id: string
  logged_at: string
  rating: number | null
  review: string | null
  status: LogStatus
  created_at: string
}

export interface DiaryEntry extends LogEntry {
  media_items: MediaItem
}

// Normalized result shape returned by the metadata edge function
export interface SearchResult {
  source: string
  externalId: string
  mediaType: SearchType
  title: string
  year: number | null
  creator: string | null
  coverUrl: string | null
}

export interface SeasonResult {
  externalId: string
  seasonNumber: number
  title: string
  year: number | null
  coverUrl: string | null
}

// Rich metadata fetched lazily per item and cached in media_items.metadata.details
export interface ItemDetails {
  description: string | null
  ratings: { source: string; value: string }[]
  backdropUrl: string | null
  coverUrl: string | null
  genres: string[]
  fetchedAt: string
}
