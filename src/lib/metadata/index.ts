import "server-only";
import type {
  ItemDetails,
  MediaType,
  SearchResult,
  SearchType,
  SeasonResult,
} from "@/lib/types";
import { searchGames, gameDetails } from "./igdb";
import { searchBooks, bookDetails } from "./openlibrary";
import { searchAlbums, albumDetails } from "./musicbrainz";
import { searchTmdb, seasonDetails, tmdbDetails, tvSeasons } from "./tmdb";
import { mockDetails, mockSearch, mockSeasons } from "./mock";

const MOCK = process.env.METADATA_MOCK === "1";

export async function searchMedia(
  type: SearchType,
  query: string,
): Promise<SearchResult[]> {
  if (MOCK) return mockSearch(type, query);
  switch (type) {
    case "film":
      return searchTmdb("movie", query);
    case "tv_show":
      return searchTmdb("tv", query);
    case "game":
      return searchGames(query);
    case "book":
      return searchBooks(query);
    case "album":
      return searchAlbums(query);
  }
}

export async function fetchSeasons(showExternalId: string): Promise<SeasonResult[]> {
  if (MOCK) return mockSeasons(showExternalId);
  return tvSeasons(showExternalId);
}

export async function fetchDetails(item: {
  mediaType: MediaType;
  externalId: string;
  showExternalId?: string | null;
  seasonNumber?: number | null;
}): Promise<ItemDetails> {
  if (MOCK) return mockDetails(item.mediaType);
  switch (item.mediaType) {
    case "film":
      return tmdbDetails("movie", item.externalId);
    case "tv_show":
      return tmdbDetails("tv", item.externalId);
    case "tv_season":
      if (!item.showExternalId || item.seasonNumber == null)
        throw new Error("tv_season details need showExternalId + seasonNumber");
      return seasonDetails(item.showExternalId, item.seasonNumber);
    case "game":
      return gameDetails(item.externalId);
    case "book":
      return bookDetails(item.externalId);
    case "album":
      return albumDetails(item.externalId);
  }
}
