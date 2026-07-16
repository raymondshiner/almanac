import { supabase } from './supabase'
import { DEV_MOCK } from '@/dev/env'
import type { SearchResult, SearchType, SeasonResult } from './types'

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
