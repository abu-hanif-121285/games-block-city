import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string) {
  try {
    const [salt, hash] = stored.split(":");
    const candidate = crypto.scryptSync(pw, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
  } catch {
    return false;
  }
}

async function isSecureRequest(req?: NextRequest): Promise<boolean> {
  try {
    const proto = req?.headers.get("x-forwarded-proto") ?? (await headers()).get("x-forwarded-proto");
    if (proto) return proto.split(",")[0].trim() === "https";
    if (req?.nextUrl?.protocol === "https:") return true;
  } catch {
    // ignore
  }
  return false;
}

export async function createSession(userId: string, req?: NextRequest) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.insert(sessions).values({ userId, token, expiresAt });
  const store = await cookies();
  const secure = await isSecureRequest(req);
  store.set("bc_session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: secure ? "none" : "lax",
    secure,
  });
  return token;
}

async function collectCandidateTokens(req?: NextRequest): Promise<string[]> {
  const candidates: string[] = [];
  const add = (val: string | null | undefined) => {
    const t = val?.trim();
    if (t && !candidates.includes(t)) candidates.push(t);
  };

  if (req) {
    add(req.headers.get("x-bc-token"));
    add(req.nextUrl.searchParams.get("_t"));
    const auth = req.headers.get("authorization") || "";
    if (auth.startsWith("Bearer ")) add(auth.slice(7));
    add(req.cookies.get("bc_session")?.value);
  }

  try {
    const h = await headers();
    add(h.get("x-bc-token"));
    const auth = h.get("authorization") || "";
    if (auth.startsWith("Bearer ")) add(auth.slice(7));
  } catch {
    // headers unavailable
  }

  try {
    const store = await cookies();
    add(store.get("bc_session")?.value);
  } catch {
    // cookies unavailable
  }

  return candidates;
}

export async function getCurrentUser(req?: NextRequest) {
  const candidates = await collectCandidateTokens(req);
  const now = new Date();

  for (const token of candidates) {
    const rows = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, token))
      .limit(1);
    if (rows.length === 0) continue;
    const s = rows[0].sessions;
    if (new Date(s.expiresAt) < now) continue;
    return rows[0].users;
  }

  return null;
}

export async function logout(req?: NextRequest) {
  const candidates = await collectCandidateTokens(req);
  for (const token of candidates) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  const store = await cookies();
  store.delete("bc_session");
}

export function publicUser(u: typeof users.$inferSelect) {
  const { passwordHash: _passwordHash, ...rest } = u;
  void _passwordHash;
  return rest;
}
