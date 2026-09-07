import Link from "next/link";
import { DiaryRow } from "@/components/diary-row";
import { getSession } from "@/lib/auth";
import { getDiary } from "@/lib/items";
import {
  DIARY_FILTERS,
  matchesFilter,
  type DiaryFilter,
  type DiaryRowData,
} from "@/lib/media";
import { cn } from "@/lib/utils";

export async function DiaryPage({ filter }: { filter: DiaryFilter }) {
  const admin = await getSession();
  const rows: DiaryRowData[] = getDiary(admin)
    .filter((r) => matchesFilter(filter, r.item.mediaType))
    .map(({ entry, item }) => ({
      entryId: entry.id,
      itemId: item.id,
      title: item.title,
      mediaType: item.mediaType,
      coverUrl: item.coverUrl,
      creator: item.creator,
      year: item.year,
      loggedAt: entry.loggedAt,
      rating: entry.rating,
      review: entry.review,
      status: entry.status,
      isPrivate: entry.isPrivate,
    }));

  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {filter === "all"
            ? "Diary"
            : DIARY_FILTERS.find((f) => f.value === filter)!.label}
        </h1>
        <span className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </span>
      </div>
      <nav aria-label="Filter by media type" className="flex gap-1 overflow-x-auto">
        {DIARY_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.path}
            aria-current={f.value === filter ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              f.value === filter
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <DiaryRow key={r.entryId} row={r} admin={admin} />
          ))}
        </ul>
      )}
    </div>
  );
}
