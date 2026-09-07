import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CoverImage } from '@/components/CoverImage'
import { EntryFields } from '@/components/EntryForm'
import { StarRating } from '@/components/StarRating'
import { useItem, useItemChildren, useItemEntries, useItemParent } from '@/hooks/useItem'
import { useItemDetails } from '@/hooks/useItemDetails'
import {
  useDeleteEntry,
  useUpdateEntry,
  type EntryDraft,
} from '@/hooks/useLogMutations'
import { MEDIA_META, STATUS_META, formatDate } from '@/lib/media'
import type { LogEntry } from '@/lib/types'

function EditEntryDialog({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const [draft, setDraft] = useState<EntryDraft>({
    logged_at: entry.logged_at,
    rating: entry.rating,
    review: entry.review,
    status: entry.status,
  })
  const update = useUpdateEntry()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
          <DialogDescription>Logged {formatDate(entry.logged_at)}</DialogDescription>
        </DialogHeader>
        <EntryFields draft={draft} onChange={setDraft} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: entry.id, patch: draft },
                {
                  onSuccess: () => {
                    toast.success('Entry updated')
                    onClose()
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 500
  return (
    <section className="grid gap-2">
      <h2 className="font-medium">About</h2>
      <p
        className={`text-sm leading-relaxed text-muted-foreground whitespace-pre-line ${
          long && !expanded ? 'line-clamp-6' : ''
        }`}
      >
        {text}
      </p>
      {long && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </section>
  )
}

function DeleteEntryButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false)
  const del = useDeleteEntry()
  if (!armed) {
    return (
      <Button variant="ghost" size="sm" aria-label="Delete entry" onClick={() => setArmed(true)}>
        <Trash2 />
        Delete
      </Button>
    )
  }
  return (
    <Button
      variant="destructive"
      size="sm"
      aria-label="Confirm delete"
      disabled={del.isPending}
      onBlur={() => setArmed(false)}
      onClick={() =>
        del.mutate(id, {
          onSuccess: () => toast.success('Entry deleted'),
          onError: (e) => toast.error(e.message),
        })
      }
    >
      Confirm delete
    </Button>
  )
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const item = useItem(id!)
  const children = useItemChildren(item.data)
  const parent = useItemParent(item.data?.parent_id)
  const isShow = item.data?.media_type === 'tv_show'
  const ready = !!item.data && (!isShow || children.data !== undefined)
  const entryIds = ready ? [id!, ...(children.data ?? []).map((c) => c.id)] : []
  const entries = useItemEntries(entryIds, ready)
  const details = useItemDetails(item.data)
  const [editing, setEditing] = useState<LogEntry | null>(null)

  if (item.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (!item.data) return <p className="text-sm text-muted-foreground">Item not found.</p>

  const it = item.data
  const seasonTitle = (itemId: string) =>
    itemId === it.id ? null : children.data?.find((c) => c.id === itemId)?.title

  const d = details.data

  return (
    <div className="grid gap-6">
      {d?.backdropUrl && (
        <div className="aspect-[21/9] w-full overflow-hidden rounded-lg border border-border">
          <img src={d.backdropUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex gap-4">
        <CoverImage
          src={it.cover_url}
          alt={it.title}
          mediaType={it.media_type}
          className="h-44 w-30 shrink-0"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{it.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{MEDIA_META[it.media_type].label}</Badge>
            {it.year != null && <span className="text-sm text-muted-foreground">{it.year}</span>}
            {d?.genres.slice(0, 3).map((g) => (
              <span key={g} className="text-sm text-muted-foreground">
                {g}
              </span>
            ))}
          </div>
          {it.creator && <p className="mt-1 text-sm text-muted-foreground">{it.creator}</p>}
          {(d?.ratings.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {d!.ratings.map((r) => (
                <Badge key={r.source} variant="outline">
                  {r.source} {r.value}
                </Badge>
              ))}
            </div>
          )}
          {parent.data && (
            <p className="mt-2 text-sm">
              Part of{' '}
              <Link
                to={`/item/${parent.data.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {parent.data.title}
              </Link>
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {it.external_source} · {it.external_id}
          </p>
        </div>
      </div>

      {details.isLoading && <Skeleton className="h-20 w-full" />}
      {d?.description && <Description text={d.description} />}

      {isShow && (children.data?.length ?? 0) > 0 && (
        <section className="grid gap-2">
          <h2 className="font-medium">Seasons logged</h2>
          <ul className="grid gap-1">
            {children.data!.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/item/${c.id}`}
                  className="text-sm underline-offset-4 hover:underline"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="font-medium">Log history</h2>
        {entries.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (entries.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No log entries.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.data!.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <time className="text-sm text-muted-foreground">
                    {formatDate(e.logged_at)}
                  </time>
                  {e.rating != null && <StarRating value={e.rating} size="sm" />}
                  {e.status !== 'done' && (
                    <Badge variant="outline">{STATUS_META[e.status].label}</Badge>
                  )}
                  {seasonTitle(e.item_id) && (
                    <Badge variant="secondary">{seasonTitle(e.item_id)}</Badge>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Edit entry"
                      onClick={() => setEditing(e)}
                    >
                      <Pencil />
                      Edit
                    </Button>
                    <DeleteEntryButton id={e.id} />
                  </div>
                </div>
                {e.review && <p className="text-sm text-muted-foreground">{e.review}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <EditEntryDialog key={editing.id} entry={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
