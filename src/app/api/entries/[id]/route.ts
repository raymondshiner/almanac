import { getSession, unauthorized } from "@/lib/auth";
import { deleteEntry, updateEntry, type EntryDraft } from "@/lib/items";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await getSession())) return unauthorized();
  const { id } = await params;
  try {
    const patch = (await request.json()) as Partial<EntryDraft>;
    return Response.json({ entry: updateEntry(id, patch) });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await getSession())) return unauthorized();
  const { id } = await params;
  deleteEntry(id);
  return Response.json({ ok: true });
}
