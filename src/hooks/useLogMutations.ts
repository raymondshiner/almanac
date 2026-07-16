import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  LogEntry,
  LogStatus,
  MediaItem,
  SearchResult,
  SeasonResult,
} from '@/lib/types'

export type EntryDraft = {
  logged_at: string
  rating: number | null
  review: string | null
  status: LogStatus
}

export type LogTarget = { result: SearchResult; season?: SeasonResult }

async function upsertItem(
  item: Omit<MediaItem, 'id' | 'created_at' | 'parent_id'> & { parent_id?: string },
): Promise<MediaItem> {
  const { data, error } = await supabase
    .from('media_items')
    .upsert(item, { onConflict: 'external_source,external_id,media_type' })
    .select()
    .single()
  if (error) throw error
  return data as MediaItem
}

/** Resolve a search result (or show+season pair) to a cached media_items row. */
async function resolveItem({ result, season }: LogTarget): Promise<MediaItem> {
  if (result.mediaType === 'tv_show') {
    if (!season) throw new Error('TV logs at season granularity — pick a season')
    const show = await upsertItem({
      media_type: 'tv_show',
      external_source: result.source,
      external_id: result.externalId,
      title: result.title,
      year: result.year,
      creator: result.creator,
      cover_url: result.coverUrl,
      metadata: {},
    })
    return upsertItem({
      media_type: 'tv_season',
      parent_id: show.id,
      external_source: result.source,
      external_id: season.externalId,
      title: `${result.title} — ${season.title}`,
      year: season.year,
      creator: result.creator,
      cover_url: season.coverUrl ?? result.coverUrl,
      metadata: { season_number: season.seasonNumber, show_external_id: result.externalId },
    })
  }
  return upsertItem({
    media_type: result.mediaType,
    external_source: result.source,
    external_id: result.externalId,
    title: result.title,
    year: result.year,
    creator: result.creator,
    cover_url: result.coverUrl,
    metadata: {},
  })
}

export function useLogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ target, entry }: { target: LogTarget; entry: EntryDraft }) => {
      const item = await resolveItem(target)
      const { data, error } = await supabase
        .from('log_entries')
        .insert({ item_id: item.id, ...entry })
        .select()
        .single()
      if (error) throw error
      return data as LogEntry
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useUpdateEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EntryDraft> }) => {
      const { error } = await supabase.from('log_entries').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('log_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}
