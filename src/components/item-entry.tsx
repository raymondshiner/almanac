"use client";

import { useState } from "react";
import { EyeOff, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditEntryDialog } from "@/components/edit-entry-dialog";
import { StarRating } from "@/components/star-rating";
import { STATUS_META, formatDate, type DiaryRowData } from "@/lib/media";

/** One log entry on an item page — no cover/title, those live in the header. */
export function ItemEntry({ row, admin }: { row: DiaryRowData; admin: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="flex gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <time className="text-sm font-medium">{formatDate(row.loggedAt)}</time>
          {row.status !== "done" && (
            <Badge variant="outline">{STATUS_META[row.status].label}</Badge>
          )}
          {row.isPrivate && (
            <EyeOff
              className="size-4 shrink-0 text-muted-foreground"
              aria-label="Private entry"
            />
          )}
        </div>
        {row.rating != null && (
          <div className="mt-1">
            <StarRating value={row.rating} size="sm" />
          </div>
        )}
        {row.review && (
          <p className="mt-1 text-sm text-muted-foreground">{row.review}</p>
        )}
      </div>
      {admin && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={`Edit entry from ${formatDate(row.loggedAt)}`}
          onClick={() => setEditing(true)}
        >
          <Pencil />
        </Button>
      )}
      {editing && (
        <EditEntryDialog
          key={row.entryId}
          row={row}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}
