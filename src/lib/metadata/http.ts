export async function getJSON(
  url: string,
  init: RequestInit = {},
  // deno-style loose JSON — every source has a different shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) throw new Error(`${url.split("?")[0]} responded ${res.status}`);
  return res.json();
}

export const yearOf = (d?: string | null): number | null =>
  d && d.length >= 4 ? Number(d.slice(0, 4)) : null;

export function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing secret ${name}`);
  return v;
}

export const nowIso = () => new Date().toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Raw = Record<string, any>;
