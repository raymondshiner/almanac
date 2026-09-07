import { getSession, unauthorized } from "@/lib/auth";
import { createEntry, type EntryDraft, type LogTarget } from "@/lib/items";

export async function POST(request: Request) {
  if (!(await getSession())) return unauthorized();
  try {
    const { target, entry } = (await request.json()) as {
      target: LogTarget;
      entry: EntryDraft;
    };
    if (!target?.result || !entry)
      return Response.json({ error: "bad request" }, { status: 400 });
    return Response.json({ entry: await createEntry(target, entry) });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
