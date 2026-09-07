import { getSession, unauthorized } from "@/lib/auth";
import { fetchSeasons } from "@/lib/metadata";

export async function GET(request: Request) {
  if (!(await getSession())) return unauthorized();
  const showId = new URL(request.url).searchParams.get("showId");
  if (!showId) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    return Response.json({ seasons: await fetchSeasons(showId) });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
