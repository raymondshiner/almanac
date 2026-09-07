import type { MediaType } from "@/db/schema";

export type { MediaType, LogStatus, MediaItem, LogEntry } from "@/db/schema";

// What the search box can look up — tv_season items are created by drilling
// into a tv_show result, never searched directly.
export type SearchType = Exclude<MediaType, "tv_season">;

export const SEARCH_TYPES: SearchType[] = [
  "film",
  "tv_show",
  "game",
  "book",
  "album",
];

// Normalized result shape returned by the metadata proxy
export interface SearchResult {
  source: string;
  externalId: string;
  mediaType: SearchType;
  title: string;
  year: number | null;
  creator: string | null;
  coverUrl: string | null;
}

export interface SeasonResult {
  externalId: string;
  seasonNumber: number;
  title: string;
  year: number | null;
  coverUrl: string | null;
}

// Rich metadata cached in media_items.metadata.details
export interface ItemDetails {
  description: string | null;
  ratings: { source: string; value: string }[];
  backdropUrl: string | null;
  coverUrl: string | null;
  genres: string[];
  fetchedAt: string;
}
