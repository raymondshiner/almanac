import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CoverImage } from "@/components/cover-image";
import { DescriptionClamp } from "@/components/description-clamp";
import { ItemEntry } from "@/components/item-entry";
import { getSession } from "@/lib/auth";
import {
  ensureDetails,
  getItem,
  getItemChildren,
  getItemEntries,
  itemDetails,
} from "@/lib/items";
import { MEDIA_META, type DiaryRowData } from "@/lib/media";
import type { MediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = getItem(id);
  if (!item) return {};
  // Cached details only — the page render backfills; crawlers arrive later.
  const details = itemDetails(item);
  const description =
    details?.description?.slice(0, 200) ??
    [MEDIA_META[item.mediaType].label, item.creator, item.year]
      .filter(Boolean)
      .join(" · ");
  const image = item.coverUrl ?? details?.backdropUrl;
  return {
    title: item.title,
    description,
    openGraph: {
      title: item.title,
      description,
      type: "article",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

function toRowData(entry: ReturnType<typeof getItemEntries>[number], item: MediaItem): DiaryRowData {
  return {
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
  };
}

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  let item = getItem(id);
  if (!item) notFound();
  const admin = await getSession();

  item = await ensureDetails(item);
  const details = itemDetails(item);
  const parent = item.parentId ? getItem(item.parentId) : undefined;
  const children =
    item.mediaType === "tv_show" ? getItemChildren(item.id) : [];
  const entries = getItemEntries([item.id], admin);

  return (
    <div className="grid gap-6">
      {details?.backdropUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- see cover-image.tsx
        <img
          src={details.backdropUrl}
          alt=""
          className="aspect-[21/9] w-full rounded-xl object-cover"
        />
      )}
      <div className="flex gap-4">
        <CoverImage
          src={item.coverUrl}
          alt=""
          mediaType={item.mediaType}
          className="h-36 w-24 shrink-0"
        />
        <div className="min-w-0 grid content-start gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <div className="text-sm text-muted-foreground">
            {[item.creator, item.year].filter(Boolean).join(" · ")}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{MEDIA_META[item.mediaType].label}</Badge>
            {details?.genres.map((g) => (
              <Badge key={g} variant="outline">
                {g}
              </Badge>
            ))}
          </div>
          {(details?.ratings.length ?? 0) > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {details!.ratings.map((r) => (
                <Badge key={r.source} variant="outline" className="font-mono">
                  {r.source} {r.value}
                </Badge>
              ))}
            </div>
          )}
          {parent && (
            <div className="text-sm text-muted-foreground">
              Part of{" "}
              <Link
                href={`/item/${parent.id}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {parent.title}
              </Link>
            </div>
          )}
        </div>
      </div>

      {details?.description && <DescriptionClamp text={details.description} />}

      {children.length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Seasons</h2>
          <ul className="divide-y divide-border">
            {children.map((c) => (
              <li key={c.id} className="py-2">
                <Link
                  href={`/item/${c.id}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {c.title}
                </Link>
                {c.year != null && (
                  <span className="text-sm text-muted-foreground"> · {c.year}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public entries.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <ItemEntry key={e.id} row={toRowData(e, item!)} admin={admin} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
