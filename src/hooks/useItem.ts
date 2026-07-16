import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LogEntry, MediaItem } from '@/lib/types'

export function useItem(id: string) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: async (): Promise<MediaItem> => {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as MediaItem
    },
  })
}

/** Seasons of a tv_show item (empty for everything else). */
export function useItemChildren(item: MediaItem | undefined) {
  return useQuery({
    queryKey: ['item-children', item?.id],
    enabled: !!item && item.media_type === 'tv_show',
    queryFn: async (): Promise<MediaItem[]> => {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('parent_id', item!.id)
        .order('title', { ascending: true })
      if (error) throw error
      return (data ?? []) as MediaItem[]
    },
  })
}

export function useItemParent(parentId: string | null | undefined) {
  return useQuery({
    queryKey: ['item', parentId],
    enabled: !!parentId,
    queryFn: async (): Promise<MediaItem> => {
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('id', parentId!)
        .single()
      if (error) throw error
      return data as MediaItem
    },
  })
}

/**
 * Log history for an item. For tv_show items the ids include the child
 * seasons, so show pages aggregate season logs.
 */
export function useItemEntries(itemIds: string[], ready: boolean) {
  return useQuery({
    queryKey: ['item-entries', ...itemIds],
    enabled: ready && itemIds.length > 0,
    queryFn: async (): Promise<LogEntry[]> => {
      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .in('item_id', itemIds)
        .order('logged_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as LogEntry[]
    },
  })
}
