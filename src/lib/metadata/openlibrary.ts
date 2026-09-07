import "server-only";
import type { ItemDetails, SearchResult } from "@/lib/types";
import { getJSON, nowIso, type Raw } from "./http";

export async function searchBooks(query: string): Promise<SearchResult[]> {
  const data = await getJSON(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,first_publish_year,author_name,cover_i`,
  );
  return ((data.docs ?? []) as Raw[]).map((d) => ({
    source: "openlibrary",
    externalId: d.key,
    mediaType: "book" as const,
    title: d.title,
    year: d.first_publish_year ?? null,
    creator: d.author_name?.[0] ?? null,
    coverUrl: d.cover_i
      ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
      : null,
  }));
}

export async function bookDetails(workKey: string): Promise<ItemDetails> {
  const d = await getJSON(`https://openlibrary.org${workKey}.json`);
  const ratings: ItemDetails["ratings"] = [];
  try {
    const r = await getJSON(`https://openlibrary.org${workKey}/ratings.json`);
    if (r.summary?.average)
      ratings.push({
        source: "Open Library",
        value: `${r.summary.average.toFixed(1)}/5`,
      });
  } catch {
    // ratings endpoint is flaky for obscure works — fine without
  }
  return {
    description:
      (typeof d.description === "string" ? d.description : d.description?.value) ||
      null,
    ratings,
    backdropUrl: null,
    coverUrl: d.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${d.covers[0]}-L.jpg`
      : null,
    genres: ((d.subjects ?? []) as string[]).slice(0, 4),
    fetchedAt: nowIso(),
  };
}
