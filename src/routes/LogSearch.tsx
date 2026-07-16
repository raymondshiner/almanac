import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CoverImage } from '@/components/CoverImage'
import { LogDialog } from '@/components/LogDialog'
import { useDebounced } from '@/hooks/useDebounced'
import type { LogTarget } from '@/hooks/useLogMutations'
import { fetchSeasons, searchMedia } from '@/lib/metadata'
import { SEARCH_TYPES } from '@/lib/media'
import type { SearchResult, SearchType } from '@/lib/types'

function ResultRow({
  result,
  onLog,
  onSeasons,
}: {
  result: SearchResult
  onLog: () => void
  onSeasons: () => void
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <CoverImage
        src={result.coverUrl}
        alt=""
        mediaType={result.mediaType}
        className="h-16 w-11 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{result.title}</div>
        <div className="text-sm text-muted-foreground">
          {[result.creator, result.year].filter(Boolean).join(' · ')}
        </div>
      </div>
      {result.mediaType === 'tv_show' ? (
        <Button variant="outline" size="sm" aria-label={`Seasons of ${result.title}`} onClick={onSeasons}>
          Seasons
        </Button>
      ) : (
        <Button size="sm" aria-label={`Log ${result.title}`} onClick={onLog}>
          Log
        </Button>
      )}
    </li>
  )
}

export default function LogSearch() {
  const [type, setType] = useState<SearchType>('film')
  const [query, setQuery] = useState('')
  const [seasonsFor, setSeasonsFor] = useState<SearchResult | null>(null)
  const [target, setTarget] = useState<LogTarget | null>(null)
  const q = useDebounced(query.trim(), 400)

  const search = useQuery({
    queryKey: ['search', type, q],
    queryFn: () => searchMedia(type, q),
    enabled: q.length >= 2,
    staleTime: 60_000,
  })
  const seasons = useQuery({
    queryKey: ['seasons', seasonsFor?.externalId],
    queryFn: () => fetchSeasons(seasonsFor!.externalId),
    enabled: !!seasonsFor,
    staleTime: 60_000,
  })

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Log</h1>
      <div className="flex gap-2">
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as SearchType)
            setSeasonsFor(null)
          }}
        >
          <SelectTrigger className="w-28 shrink-0" aria-label="Media type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEARCH_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="search"
          aria-label="Search titles"
          placeholder="Search titles…"
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSeasonsFor(null)
          }}
        />
      </div>

      {seasonsFor ? (
        <div className="grid gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => setSeasonsFor(null)}
          >
            <ArrowLeft />
            Back to results
          </Button>
          <div className="font-medium">
            {seasonsFor.title}
            {seasonsFor.year != null && (
              <span className="text-muted-foreground"> · {seasonsFor.year}</span>
            )}
          </div>
          {seasons.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (seasons.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No seasons found.</p>
          ) : (
            <ul className="divide-y divide-border">
              {seasons.data!.map((s) => (
                <li key={s.externalId} className="flex items-center gap-3 py-3">
                  <CoverImage
                    src={s.coverUrl}
                    alt=""
                    mediaType="tv_season"
                    className="h-16 w-11 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.title}</div>
                    {s.year != null && (
                      <div className="text-sm text-muted-foreground">{s.year}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    aria-label={`Log ${seasonsFor.title} ${s.title}`}
                    onClick={() => setTarget({ result: seasonsFor, season: s })}
                  >
                    Log
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : q.length < 2 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Search for a {SEARCH_TYPES.find((t) => t.value === type)?.label.toLowerCase()} to log
          it.
        </p>
      ) : search.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : search.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          Search failed — {search.error.message}
        </p>
      ) : (search.data?.length ?? 0) === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No results.</p>
      ) : (
        <ul className="divide-y divide-border">
          {search.data!.map((r) => (
            <ResultRow
              key={`${r.source}-${r.externalId}`}
              result={r}
              onLog={() => setTarget({ result: r })}
              onSeasons={() => setSeasonsFor(r)}
            />
          ))}
        </ul>
      )}

      {target && (
        <LogDialog
          key={`${target.result.externalId}-${target.season?.externalId ?? ''}`}
          target={target}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  )
}
