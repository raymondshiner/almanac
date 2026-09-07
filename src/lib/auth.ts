import "server-only";
import crypto from "node:crypto";
import argon2 from "argon2";
import { eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, sessions, siteConfig } from "@/db";

export const SESSION_COOKIE = "almanac_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getConfig(key: string): string | null {
  const row = db.select().from(siteConfig).where(eq(siteConfig.key, key)).get();
  return row?.value ?? null;
}

function setConfig(key: string, value: string) {
  db.insert(siteConfig)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteConfig.key, set: { value } })
    .run();
}

// Credential lives in the DB (argon2 hash), seeded from env on first login
// attempt. The installer writes ADMIN_USERNAME/ADMIN_PASSWORD into .env.
async function ensureSeeded() {
  if (getConfig("admin_password_hash")) return;
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass)
    throw new Error("No admin credential — set ADMIN_USERNAME and ADMIN_PASSWORD");
  setConfig("admin_username", user);
  setConfig("admin_password_hash", await argon2.hash(pass));
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  await ensureSeeded();
  const storedUser = getConfig("admin_username");
  const storedHash = getConfig("admin_password_hash");
  if (!storedUser || !storedHash || username !== storedUser) return false;
  return argon2.verify(storedHash, password);
}

export async function createSession(): Promise<void> {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  db.delete(sessions).where(lt(sessions.expiresAt, new Date(now))).run();
  db.insert(sessions)
    .values({ token, expiresAt: new Date(now + SESSION_TTL_MS) })
    .run();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const row = db.select().from(sessions).where(eq(sessions.token, token)).get();
  return !!row && row.expiresAt.getTime() > Date.now();
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) db.delete(sessions).where(eq(sessions.token, token)).run();
  store.delete(SESSION_COOKIE);
}

/** Guard for write paths: resolves when an admin session exists, else throws. */
export async function requireAdmin(): Promise<void> {
  if (!(await getSession())) {
    const err = new Error("unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
}

/** 401 JSON response helper for route handlers. */
export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
