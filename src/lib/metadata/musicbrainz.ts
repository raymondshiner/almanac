import "server-only";
import type { ItemDetails, SearchResult } from "@/lib/types";
import { getJSON, nowIso, type Raw } from "./http";

const UA = "almanac/0.2 (https://github.com/raymondshiner/almanac)";

// MusicBrainz etiquette: identifying UA + max 1 req/s. Server-side queue
// spaces every MB call regardless of caller.
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function throttledMb(url: string): Promise<Raw> {
  const next = chain.then(async () => {
    const wait = lastCall + 1000 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return getJSON(url, { headers: { "User-Agent": UA } });
  });
  chain = next.catch(() => {});
  return next;
}

export async function searchAlbums(query: string): Promise<SearchResult[]> {
  const lucene = `releasegroup:"${query.replaceAll('"', "")}" AND primarytype:album`;
  const data = await throttledMb(
    `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(lucene)}&fmt=json&limit=20`,
  );
  return ((data["release-groups"] ?? []) as Raw[]).map((r) => ({
    source: "musicbrainz",
    externalId: r.id,
    mediaType: "album" as const,
    title: r.title,
    year:
      r["first-release-date"] && r["first-release-date"].length >= 4
        ? Number(r["first-release-date"].slice(0, 4))
        : null,
    creator: r["artist-credit"]?.map((a: Raw) => a.name).join(" & ") ?? null,
    // Cover Art Archive may 404 for obscure releases — the client falls back.
    coverUrl: `https://coverartarchive.org/release-group/${r.id}/front-250`,
  }));
}

export async function albumDetails(rgid: string): Promise<ItemDetails> {
  // MusicBrainz has no prose; chase the Wikidata relation to a Wikipedia
  // summary. Any hop failing just means no description.
  const rg = await throttledMb(
    `https://musicbrainz.org/ws/2/release-group/${rgid}?inc=url-rels+ratings+genres&fmt=json`,
  );
  let description: string | null = null;
  try {
    const wikidata = ((rg.relations ?? []) as Raw[]).find((r) => r.type === "wikidata");
    const qid = wikidata?.url?.resource?.split("/").pop();
    if (qid) {
      const entity = await getJSON(
        `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
      );
      const title = entity.entities?.[qid]?.sitelinks?.enwiki?.title;
      if (title) {
        const sum = await getJSON(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        );
        description = sum.extract || null;
      }
    }
  } catch {
    // no Wikipedia article — description stays null
  }
  const ratings: ItemDetails["ratings"] = [];
  if (rg.rating?.value && rg.rating["votes-count"] > 0)
    ratings.push({ source: "MusicBrainz", value: `${rg.rating.value}/5` });
  return {
    description,
    ratings,
    backdropUrl: null,
    coverUrl: `https://coverartarchive.org/release-group/${rgid}/front-500`,
    genres: ((rg.genres ?? []) as Raw[])
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 4)
      .map((g) => String(g.name)),
    fetchedAt: nowIso(),
  };
}
