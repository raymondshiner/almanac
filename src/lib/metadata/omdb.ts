import "server-only";
import { getJSON, type Raw } from "./http";

// OMDb is the only free door to IMDb + Rotten Tomatoes numbers. Best-effort:
// missing key, missing imdb id, or an OMDb hiccup all degrade to no ratings.
export async function omdbRatings(
  imdbId: string | null | undefined,
): Promise<{ source: string; value: string }[]> {
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return [];
  try {
    const d = await getJSON(`https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`);
    return ((d.Ratings ?? []) as Raw[]).map((r) => ({
      source: r.Source === "Internet Movie Database" ? "IMDb" : String(r.Source),
      value: String(r.Value),
    }));
  } catch {
    return [];
  }
}
