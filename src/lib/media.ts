import {
  BookOpen,
  Clapperboard,
  Disc3,
  Gamepad2,
  Tv,
  type LucideIcon,
} from "lucide-react";
import type { LogStatus, MediaType, SearchType } from "./types";

export const MEDIA_META: Record<MediaType, { label: string; icon: LucideIcon }> = {
  film: { label: "Film", icon: Clapperboard },
  tv_show: { label: "TV", icon: Tv },
  tv_season: { label: "TV", icon: Tv },
  game: { label: "Game", icon: Gamepad2 },
  book: { label: "Book", icon: BookOpen },
  album: { label: "Album", icon: Disc3 },
};

export const SEARCH_TYPE_OPTIONS: { value: SearchType; label: string }[] = [
  { value: "film", label: "Film" },
  { value: "tv_show", label: "TV" },
  { value: "game", label: "Game" },
  { value: "book", label: "Book" },
  { value: "album", label: "Album" },
];

export type DiaryFilter = "all" | "film" | "tv" | "game" | "book" | "album";

export const DIARY_FILTERS: { value: DiaryFilter; label: string; path: string }[] = [
  { value: "all", label: "All", path: "/" },
  { value: "film", label: "Film", path: "/movies" },
  { value: "tv", label: "TV", path: "/shows" },
  { value: "game", label: "Games", path: "/games" },
  { value: "book", label: "Books", path: "/books" },
  { value: "album", label: "Music", path: "/music" },
];

export function matchesFilter(filter: DiaryFilter, type: MediaType): boolean {
  if (filter === "all") return true;
  if (filter === "tv") return type === "tv_show" || type === "tv_season";
  return filter === type;
}

export const STATUS_META: Record<LogStatus, { label: string }> = {
  done: { label: "Done" },
  in_progress: { label: "In progress" },
  abandoned: { label: "Abandoned" },
};

// Fixed locale so server render and client hydration agree.
export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Serializable draft shape shared by log + edit forms; mirrors the server's
// EntryDraft (which lives behind server-only and can't be imported here).
export type EntryDraftInput = {
  loggedAt: string;
  rating: number | null;
  review: string | null;
  status: LogStatus;
  isPrivate: boolean;
};

// Flat, serializable diary row passed from server components to client rows.
export type DiaryRowData = {
  entryId: string;
  itemId: string;
  title: string;
  mediaType: MediaType;
  coverUrl: string | null;
  creator: string | null;
  year: number | null;
  loggedAt: string;
  rating: number | null;
  review: string | null;
  status: LogStatus;
  isPrivate: boolean;
};
