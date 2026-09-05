import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CoverImage } from '@/components/CoverImage'
import { StarRating } from '@/components/StarRating'
import { useDiary } from '@/hooks/useDiary'
import {
  DIARY_FILTERS,
  FILTER_PATHS,
  MEDIA_META,
  STATUS_META,
  filterFromPath,
  formatDate,
  matchesFilter,
  type DiaryFilter,
} from '@/lib/media'
import type { DiaryEntry } from '@/lib/types'

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  const item = entry.media_items
  return (
    <li className="flex gap-3 py-3">
      <Link to={`/item/${item.id}`} className="shrink-0">
        <CoverImage
          src={item.cover_url}
          alt=""
          mediaType={item.media_type}
          className="h-20 w-14"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            to={`/item/${item.id}`}
            className="truncate font-medium underline-offset-4 hover:underline"
          >
            {item.title}
          </Link>
          <Badge variant="secondary">{MEDIA_META[item.media_type].label}</Badge>
          {entry.status !== 'done' && (
            <Badge variant="outline">{STATUS_META[entry.status].label}</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {[item.creator, item.year].filter(Boolean).join(' · ')}
        </div>
        {entry.rating != null && (
          <div className="mt-1">
            <StarRating value={entry.rating} size="sm" />
          </div>
        )}
        {entry.review && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{entry.review}</p>
        )}
      </div>
      <time className="shrink-0 text-sm text-muted-foreground">
        {formatDate(entry.logged_at)}
      </time>
    </li>
  )
}

export default function Diary() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const filter = filterFromPath(pathname)
  const diary = useDiary()
  const entries = (diary.data ?? []).filter((e) =>
    matchesFilter(filter, e.media_items.media_type),
  )

  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {filter === 'all'
            ? 'Diary'
            : DIARY_FILTERS.find((f) => f.value === filter)!.label}
        </h1>
        {diary.data && (
          <span className="text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>
      <Tabs
        value={filter}
        onValueChange={(v) => navigate(FILTER_PATHS[v as DiaryFilter])}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {DIARY_FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {diary.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing logged yet — hit Log to add your first entry.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <DiaryRow key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  )
}
