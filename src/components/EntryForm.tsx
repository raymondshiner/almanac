import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/StarRating'
import { STATUS_META } from '@/lib/media'
import type { LogStatus } from '@/lib/types'
import type { EntryDraft } from '@/hooks/useLogMutations'

export function makeDraft(): EntryDraft {
  return {
    logged_at: new Date().toISOString().slice(0, 10),
    rating: null,
    review: null,
    status: 'done',
  }
}

export function EntryFields({
  draft,
  onChange,
}: {
  draft: EntryDraft
  onChange: (d: EntryDraft) => void
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="entry-date">Date</Label>
        <Input
          id="entry-date"
          type="date"
          value={draft.logged_at}
          onChange={(e) => onChange({ ...draft, logged_at: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Rating</Label>
        <StarRating
          value={draft.rating}
          onChange={(rating) => onChange({ ...draft, rating })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Status</Label>
        <Select
          value={draft.status}
          onValueChange={(status) => onChange({ ...draft, status: status as LogStatus })}
        >
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_META) as LogStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="entry-review">Review (optional)</Label>
        <Textarea
          id="entry-review"
          rows={3}
          placeholder="Thoughts…"
          value={draft.review ?? ''}
          onChange={(e) => onChange({ ...draft, review: e.target.value || null })}
        />
      </div>
    </div>
  )
}
