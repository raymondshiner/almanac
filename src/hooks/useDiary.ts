import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DiaryEntry } from '@/lib/types'

export function useDiary() {
  return useQuery({
    queryKey: ['diary'],
    queryFn: async (): Promise<DiaryEntry[]> => {
      const { data, error } = await supabase
        .from('log_entries')
        .select('*, media_items(*)')
        .order('logged_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as DiaryEntry[]
    },
  })
}
