import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db,
  logEntries,
  mediaItems,
  type LogEntry,
  type MediaItem,
  type NewLogEntry,
} from "@/db";
import { fetchDetails } from "@/lib/metadata";
import type { ItemDetails, SearchResult, SeasonResult } from "@/lib/types";

export type DiaryRow = { entry: LogEntry; item: MediaItem };

export function getDiary(includePrivate: boolean): DiaryRow[] {
  const rows = db
    .select()
    .from(logEntries)
    .innerJoin(mediaItems, eq(logEntries.itemId, mediaItems.id))
    .orderBy(desc(logEntries.loggedAt), desc(logEntries.createdAt))
    .all();
  return rows
    .filter((r) => includePrivate || !r.log_entries.isPrivate)
    .map((r) => ({ entry: r.log_entries, item: r.media_items }));
}

export function getItem(id: string): MediaItem | undefined {
  return db.select().from(mediaItems).where(eq(mediaItems.id, id)).get();
}

export function getItemChildren(id: string): MediaItem[] {
  return db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.parentId, id))
    .orderBy(mediaItems.title)
    .all();
}

export function getItemEntries(itemIds: string[], includePrivate: boolean): LogEntry[] {
  if (itemIds.length === 0) return [];
  return db
    .select()
    .from(logEntries)
    .where(inArray(logEntries.itemId, itemIds))
    .orderBy(desc(logEntries.loggedAt), desc(logEntries.createdAt))
    .all()
    .filter((e) => includePrivate || !e.isPrivate);
}

function upsertItem(item: {
  mediaType: MediaItem["mediaType"];
  parentId?: string;
  externalSource: string;
  externalId: string;
  title: string;
  year: number | null;
  creator: string | null;
  coverUrl: string | null;
  metadata?: Record<string, unknown>;
}): MediaItem {
  return db
    .insert(mediaItems)
    .values(item)
    .onConflictDoUpdate({
      target: [mediaItems.externalSource, mediaItems.externalId, mediaItems.mediaType],
      set: {
        title: item.title,
        year: item.year,
        creator: item.creator,
        coverUrl: item.coverUrl,
      },
    })
    .returning()
    .get();
}

export type LogTarget = { result: SearchResult; season?: SeasonResult };

/** Resolve a search result (or show+season pair) to a cached media_items row. */
export function resolveItem({ result, season }: LogTarget): MediaItem {
  if (result.mediaType === "tv_show") {
    if (!season) throw new Error("TV logs at season granularity — pick a season");
    const show = upsertItem({
      mediaType: "tv_show",
      externalSource: result.source,
      externalId: result.externalId,
      title: result.title,
      year: result.year,
      creator: result.creator,
      coverUrl: result.coverUrl,
    });
    return upsertItem({
      mediaType: "tv_season",
      parentId: show.id,
      externalSource: result.source,
      externalId: season.externalId,
      title: `${result.title} — ${season.title}`,
      year: season.year,
      creator: result.creator,
      coverUrl: season.coverUrl ?? result.coverUrl,
      metadata: {
        season_number: season.seasonNumber,
        show_external_id: result.externalId,
      },
    });
  }
  return upsertItem({
    mediaType: result.mediaType,
    externalSource: result.source,
    externalId: result.externalId,
    title: result.title,
    year: result.year,
    creator: result.creator,
    coverUrl: result.coverUrl,
  });
}

export function itemDetails(item: MediaItem): ItemDetails | null {
  return (item.metadata.details as ItemDetails | undefined) ?? null;
}

/**
 * Rich metadata (description, external ratings, backdrop) cached on the item.
 * Fetched once from the source APIs, persisted into metadata.details; items
 * created before this feature backfill on first page view. Fetch failures
 * degrade to the item as-is.
 */
export async function ensureDetails(item: MediaItem): Promise<MediaItem> {
  if (item.metadata.details) return item;
  try {
    const details = await fetchDetails({
      mediaType: item.mediaType,
      externalId: item.externalId,
      showExternalId: item.metadata.show_external_id as string | undefined,
      seasonNumber: item.metadata.season_number as number | undefined,
    });
    const metadata = { ...item.metadata, details };
    const coverUrl = details.coverUrl ?? item.coverUrl;
    db.update(mediaItems)
      .set({ metadata, coverUrl })
      .where(eq(mediaItems.id, item.id))
      .run();
    return { ...item, metadata, coverUrl };
  } catch (e) {
    console.error(`ensureDetails(${item.mediaType}:${item.externalId}) failed:`, e);
    return item;
  }
}

export type EntryDraft = {
  loggedAt: string;
  rating: number | null;
  review: string | null;
  status: LogEntry["status"];
  isPrivate: boolean;
};

const RATING_OK = (r: number | null) =>
  r == null || (r >= 0.5 && r <= 5 && Math.trunc(r * 2) === r * 2);

function validateDraft(draft: Partial<EntryDraft>) {
  if ("rating" in draft && !RATING_OK(draft.rating ?? null))
    throw new Error("rating must be 0.5–5.0 in half steps");
  if ("loggedAt" in draft && !/^\d{4}-\d{2}-\d{2}$/.test(draft.loggedAt ?? ""))
    throw new Error("loggedAt must be YYYY-MM-DD");
}

export async function createEntry(target: LogTarget, draft: EntryDraft): Promise<LogEntry> {
  validateDraft(draft);
  const item = resolveItem(target);
  // Fetch details at log time so public pages are complete from the start.
  await ensureDetails(item);
  const values: NewLogEntry = { itemId: item.id, ...draft };
  return db.insert(logEntries).values(values).returning().get();
}

export function updateEntry(id: string, patch: Partial<EntryDraft>): LogEntry {
  validateDraft(patch);
  const row = db
    .update(logEntries)
    .set(patch)
    .where(eq(logEntries.id, id))
    .returning()
    .get();
  if (!row) throw new Error("entry not found");
  return row;
}

export function deleteEntry(id: string): void {
  db.delete(logEntries).where(eq(logEntries.id, id)).run();
}
