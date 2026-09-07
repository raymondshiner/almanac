"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/cover-image";
import { EditEntryDialog } from "@/components/edit-entry-dialog";
import { StarRating } from "@/components/star-rating";
import {
  MEDIA_META,
  STATUS_META,
  formatDate,
  type DiaryRowData,
} from "@/lib/media";

export function DiaryRow({ row, admin }: { row: DiaryRowData; admin: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="flex gap-3 py-3">
      <Link href={`/item/${row.itemId}`} className="shrink-0">
        <CoverImage
          src={row.coverUrl}
          alt=""
          mediaType={row.mediaType}
          className="h-20 w-14"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/item/${row.itemId}`}
            className="truncate font-medium underline-offset-4 hover:underline"
          >
            {row.title}
          </Link>
          <Badge variant="secondary">{MEDIA_META[row.mediaType].label}</Badge>
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
        <div className="text-sm text-muted-foreground">
          {[row.creator, row.year].filter(Boolean).join(" · ")}
        </div>
        {row.rating != null && (
          <div className="mt-1">
            <StarRating value={row.rating} size="sm" />
          </div>
        )}
        {row.review && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {row.review}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <time className="text-sm text-muted-foreground">
          {formatDate(row.loggedAt)}
        </time>
        {admin && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit entry for ${row.title}`}
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
        )}
      </div>
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
