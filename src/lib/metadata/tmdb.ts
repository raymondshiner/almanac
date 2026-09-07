import "server-only";
import type { ItemDetails, SearchResult, SeasonResult } from "@/lib/types";
import { getJSON, need, nowIso, yearOf, type Raw } from "./http";
import { omdbRatings } from "./omdb";

const IMG = "https://image.tmdb.org/t/p/w342";
const BACKDROP = "https://image.tmdb.org/t/p/w1280";
const API = "https://api.themoviedb.org/3";

export async function searchTmdb(
  kind: "movie" | "tv",
  query: string,
): Promise<SearchResult[]> {
  const key = need("TMDB_API_KEY");
  const data = await getJSON(
    `${API}/search/${kind}?api_key=${key}&query=${encodeURIComponent(query)}&include_adult=false`,
  );
  return ((data.results ?? []) as Raw[]).slice(0, 20).map((r) => ({
    source: "tmdb",
    externalId: String(r.id),
    mediaType: kind === "movie" ? "film" : "tv_show",
    title: kind === "movie" ? r.title : r.name,
    year: yearOf(kind === "movie" ? r.release_date : r.first_air_date),
    creator: null,
    coverUrl: r.poster_path ? IMG + r.poster_path : null,
  }));
}

export async function tvSeasons(showId: string): Promise<SeasonResult[]> {
  const key = need("TMDB_API_KEY");
  const data = await getJSON(`${API}/tv/${showId}?api_key=${key}`);
  return ((data.seasons ?? []) as Raw[]).map((s) => ({
    externalId: String(s.id),
    seasonNumber: s.season_number,
    title: s.name,
    year: yearOf(s.air_date),
    coverUrl: s.poster_path ? IMG + s.poster_path : null,
  }));
}

export async function tmdbDetails(
  kind: "movie" | "tv",
  id: string,
): Promise<ItemDetails> {
  const key = need("TMDB_API_KEY");
  const d = await getJSON(
    `${API}/${kind}/${id}?api_key=${key}&append_to_response=external_ids`,
  );
  const imdbId =
    kind === "movie" ? (d.imdb_id ?? d.external_ids?.imdb_id) : d.external_ids?.imdb_id;
  return {
    description: d.overview || null,
    ratings: await omdbRatings(imdbId),
    backdropUrl: d.backdrop_path ? BACKDROP + d.backdrop_path : null,
    coverUrl: null,
    genres: ((d.genres ?? []) as Raw[]).map((g) => String(g.name)),
    fetchedAt: nowIso(),
  };
}

export async function seasonDetails(
  showId: string,
  seasonNumber: number,
): Promise<ItemDetails> {
  const key = need("TMDB_API_KEY");
  const d = await getJSON(`${API}/tv/${showId}/season/${seasonNumber}?api_key=${key}`);
  return {
    description: d.overview || null,
    ratings: [],
    backdropUrl: null,
    coverUrl: null,
    genres: [],
    fetchedAt: nowIso(),
  };
}
