import type { EntryDraftInput } from "./media";
import type { SearchResult, SearchType, SeasonResult } from "./types";

export type LogTargetInput = { result: SearchResult; season?: SeasonResult };

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `request failed (${res.status})`);
  return body as T;
}

export const api = {
  search: (type: SearchType, q: string) =>
    j<{ results: SearchResult[] }>(
      `/api/metadata/search?type=${type}&q=${encodeURIComponent(q)}`,
    ).then((r) => r.results),
  seasons: (showId: string) =>
    j<{ seasons: SeasonResult[] }>(
      `/api/metadata/seasons?showId=${encodeURIComponent(showId)}`,
    ).then((r) => r.seasons),
  createEntry: (target: LogTargetInput, entry: EntryDraftInput) =>
    j("/api/entries", { method: "POST", body: JSON.stringify({ target, entry }) }),
  updateEntry: (id: string, patch: Partial<EntryDraftInput>) =>
    j(`/api/entries/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteEntry: (id: string) => j(`/api/entries/${id}`, { method: "DELETE" }),
  logout: () => j("/api/auth/logout", { method: "POST" }),
};
