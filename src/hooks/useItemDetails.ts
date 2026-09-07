import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDetails } from '@/lib/metadata'
import { supabase } from '@/lib/supabase'
import type { ItemDetails, MediaItem } from '@/lib/types'

/**
 * Rich metadata for an item — description, external ratings, backdrop, genres.
 * Fetched once per item from the metadata edge function, then persisted into
 * media_items.metadata.details so every later visit (any user) reads the cache.
 * Existing rows backfill themselves the first time someone opens them.
 */
export function useItemDetails(item: MediaItem | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['item-details', item?.id],
    enabled: !!item,
    staleTime: Infinity,
    queryFn: async (): Promise<ItemDetails> => {
      const cached = item!.metadata.details as ItemDetails | undefined
      if (cached) return cached
      const details = await fetchDetails(item!)
      const patch: Record<string, unknown> = {
        metadata: { ...item!.metadata, details },
      }
      if (details.coverUrl && details.coverUrl !== item!.cover_url)
        patch.cover_url = details.coverUrl
      // Persist is best-effort — a failed write shouldn't blank the page.
      const { error } = await supabase.from('media_items').update(patch).eq('id', item!.id)
      if (!error) qc.invalidateQueries({ queryKey: ['item', item!.id] })
      return details
    },
  })
}
