import "server-only";
import type { ItemDetails, SearchResult } from "@/lib/types";
import { getJSON, need, nowIso, type Raw } from "./http";

// IGDB auths via Twitch client-credentials. Token cached in module scope,
// refreshed 60s before expiry.
let token: { value: string; expiresAt: number } | null = null;

async function igdbToken(): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value;
  const id = need("TWITCH_CLIENT_ID");
  const secret = need("TWITCH_CLIENT_SECRET");
  const d = await getJSON(
    `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
    { method: "POST" },
  );
  token = {
    value: d.access_token,
    expiresAt: Date.now() + (d.expires_in - 60) * 1000,
  };
  return token.value;
}

async function igdb(endpoint: string, body: string): Promise<Raw[]> {
  const t = await igdbToken();
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": need("TWITCH_CLIENT_ID"),
      Authorization: `Bearer ${t}`,
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`igdb/${endpoint} responded ${res.status}`);
  return res.json();
}

const img = (imageId: string, size: string) =>
  `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;

export async function searchGames(query: string): Promise<SearchResult[]> {
  const rows = await igdb(
    "games",
    `search "${query.replaceAll('"', "")}";
     fields name,first_release_date,cover.image_id,involved_companies.company.name,involved_companies.developer;
     where version_parent = null;
     limit 20;`,
  );
  return rows.map((r) => ({
    source: "igdb",
    externalId: String(r.id),
    mediaType: "game" as const,
    title: r.name,
    year: r.first_release_date
      ? new Date(r.first_release_date * 1000).getUTCFullYear()
      : null,
    creator:
      (r.involved_companies as Raw[] | undefined)?.find((c) => c.developer)?.company
        ?.name ?? null,
    coverUrl: r.cover?.image_id ? img(r.cover.image_id, "cover_big") : null,
  }));
}

export async function gameDetails(id: string): Promise<ItemDetails> {
  const rows = await igdb(
    "games",
    `fields summary,genres.name,aggregated_rating,aggregated_rating_count,rating,rating_count,artworks.image_id,screenshots.image_id;
     where id = ${Number(id)};`,
  );
  const d = rows[0] ?? {};
  const ratings: ItemDetails["ratings"] = [];
  if (d.aggregated_rating && d.aggregated_rating_count > 0)
    ratings.push({ source: "Critics", value: `${Math.round(d.aggregated_rating)}/100` });
  if (d.rating && d.rating_count > 0)
    ratings.push({ source: "IGDB", value: `${Math.round(d.rating)}/100` });
  const art = d.artworks?.[0]?.image_id ?? d.screenshots?.[0]?.image_id;
  return {
    description: d.summary?.trim() || null,
    ratings,
    backdropUrl: art ? img(art, "1080p") : null,
    coverUrl: null,
    genres: ((d.genres ?? []) as Raw[]).map((g) => String(g.name)),
    fetchedAt: nowIso(),
  };
}
