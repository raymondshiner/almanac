import { supabase } from './supabase'
import { DEV_MOCK } from '@/dev/env'
import type { ItemDetails, MediaItem, SearchResult, SearchType, SeasonResult } from './types'

export async function searchMedia(type: SearchType, query: string): Promise<SearchResult[]> {
  if (import.meta.env.DEV && DEV_MOCK) {
    const { mockSearch } = await import('@/dev/mockMetadata')
    return mockSearch(type, query)
  }
  const { data, error } = await supabase.functions.invoke('metadata', {
    body: { action: 'search', type, query },
  })
  if (error) throw error
  return data.results as SearchResult[]
}

export async function fetchSeasons(showExternalId: string): Promise<SeasonResult[]> {
  if (import.meta.env.DEV && DEV_MOCK) {
    const { mockSeasons } = await import('@/dev/mockMetadata')
    return mockSeasons(showExternalId)
  }
  const { data, error } = await supabase.functions.invoke('metadata', {
    body: { action: 'seasons', showId: showExternalId },
  })
  if (error) throw error
  return data.seasons as SeasonResult[]
}

export async function fetchDetails(item: MediaItem): Promise<ItemDetails> {
  if (import.meta.env.DEV && DEV_MOCK) {
    const { mockDetails } = await import('@/dev/mockMetadata')
    return mockDetails(item.media_type)
  }
  const { data, error } = await supabase.functions.invoke('metadata', {
    body: {
      action: 'details',
      type: item.media_type,
      externalId: item.external_id,
      showExternalId: item.metadata.show_external_id,
      seasonNumber: item.metadata.season_number,
    },
  })
  if (error) throw error
  return data.details as ItemDetails
}
