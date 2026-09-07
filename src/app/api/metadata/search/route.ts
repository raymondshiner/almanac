import { getSession, unauthorized } from "@/lib/auth";
import { searchMedia } from "@/lib/metadata";
import { SEARCH_TYPES, type SearchType } from "@/lib/types";

export async function GET(request: Request) {
  if (!(await getSession())) return unauthorized();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as SearchType | null;
  const q = url.searchParams.get("q")?.trim();
  if (!type || !SEARCH_TYPES.includes(type) || !q)
    return Response.json({ error: "bad request" }, { status: 400 });
  try {
    return Response.json({ results: await searchMedia(type, q) });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
