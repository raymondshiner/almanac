"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { STATUS_META, type EntryDraftInput } from "@/lib/media";
import type { LogStatus } from "@/lib/types";

export function makeDraft(): EntryDraftInput {
  return {
    // en-CA renders YYYY-MM-DD in local time (toISOString would shift the day
    // for evening logs west of UTC).
    loggedAt: new Date().toLocaleDateString("en-CA"),
    rating: null,
    review: null,
    status: "done",
    isPrivate: false,
  };
}

export function EntryFields({
  draft,
  onChange,
}: {
  draft: EntryDraftInput;
  onChange: (d: EntryDraftInput) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="entry-date">Date</Label>
        <Input
          id="entry-date"
          type="date"
          value={draft.loggedAt}
          onChange={(e) => onChange({ ...draft, loggedAt: e.target.value })}
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
          onValueChange={(status) =>
            onChange({ ...draft, status: status as LogStatus })
          }
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
          value={draft.review ?? ""}
          onChange={(e) => onChange({ ...draft, review: e.target.value || null })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={draft.isPrivate}
          onChange={(e) => onChange({ ...draft, isPrivate: e.target.checked })}
        />
        Private — hide from the public site
      </label>
    </div>
  );
}
