import { BookOpen, Clapperboard, Disc3, Gamepad2, Tv, type LucideIcon } from 'lucide-react'
import type { MediaType, SearchType, LogStatus } from './types'

export const MEDIA_META: Record<MediaType, { label: string; icon: LucideIcon }> = {
  film: { label: 'Film', icon: Clapperboard },
  tv_show: { label: 'TV', icon: Tv },
  tv_season: { label: 'TV', icon: Tv },
  game: { label: 'Game', icon: Gamepad2 },
  book: { label: 'Book', icon: BookOpen },
  album: { label: 'Album', icon: Disc3 },
}

export const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'film', label: 'Film' },
  { value: 'tv_show', label: 'TV' },
  { value: 'game', label: 'Game' },
  { value: 'book', label: 'Book' },
  { value: 'album', label: 'Album' },
]

export type DiaryFilter = 'all' | 'film' | 'tv' | 'game' | 'book' | 'album'

export const DIARY_FILTERS: { value: DiaryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'film', label: 'Film' },
  { value: 'tv', label: 'TV' },
  { value: 'game', label: 'Games' },
  { value: 'book', label: 'Books' },
  { value: 'album', label: 'Music' },
]

export function matchesFilter(filter: DiaryFilter, type: MediaType): boolean {
  if (filter === 'all') return true
  if (filter === 'tv') return type === 'tv_show' || type === 'tv_season'
  return filter === type
}

export const STATUS_META: Record<LogStatus, { label: string }> = {
  done: { label: 'Done' },
  in_progress: { label: 'In progress' },
  abandoned: { label: 'Abandoned' },
}

export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
