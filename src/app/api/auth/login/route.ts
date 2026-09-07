import { createSession, verifyCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  if (typeof username !== "string" || typeof password !== "string")
    return Response.json({ error: "bad request" }, { status: 400 });
  if (!(await verifyCredentials(username, password)))
    return Response.json({ error: "invalid credentials" }, { status: 401 });
  await createSession();
  return Response.json({ ok: true });
}
