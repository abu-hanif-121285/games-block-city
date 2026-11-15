import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createSession, logout, publicUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action === "register") {
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const displayName = String(body.displayName || username).trim().slice(0, 24);
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return NextResponse.json({ error: "Username 3-20 karakter huruf/angka/underscore" }, { status: 400 });
    if (password.length < 4) return NextResponse.json({ error: "Password minimal 4 karakter" }, { status: 400 });
    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing.length) return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
    const isFirst = (await db.select({ id: users.id }).from(users).limit(1)).length === 0;
    const [u] = await db.insert(users).values({
      username, passwordHash: hashPassword(password), displayName,
      gender: body.gender || "male", skinColor: body.skinColor || "#f2c79b",
      hairColor: body.hairColor || "#3b2f2f", hairStyle: body.hairStyle || "short",
      shirtColor: body.shirtColor || "#2563eb", pantsColor: body.pantsColor || "#1e293b",
      hat: body.hat || "none", accessory: body.accessory || "none",
      isAdmin: isFirst,
    }).returning();
    const token = await createSession(u.id, req);
    return NextResponse.json({ user: publicUser(u), token });
  }
  if (action === "login") {
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!rows.length || !verifyPassword(password, rows[0].passwordHash)) return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    const token = await createSession(rows[0].id, req);
    await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, rows[0].id));
    return NextResponse.json({ user: publicUser(rows[0]), token });
  }
  if (action === "logout") {
    await logout(req);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
}
