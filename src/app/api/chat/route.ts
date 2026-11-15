import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { desc, gt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const lastSent = new Map<string, number>();

export async function GET(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(Number(since)) : new Date(Date.now() - 5 * 60 * 1000);
  const rows = await db.select().from(chatMessages).where(gt(chatMessages.createdAt, sinceDate)).orderBy(desc(chatMessages.createdAt)).limit(50);
  return NextResponse.json({ messages: rows.reverse() });
}

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const now = Date.now();
  const last = lastSent.get(u.id) || 0;
  if (now - last < 800) return NextResponse.json({ error: "Terlalu cepat — tunggu sebentar" }, { status: 429 });
  lastSent.set(u.id, now);
  const body = await req.json().catch(() => ({}));
  const message = String(body.message || "").trim().slice(0, 200);
  if (!message) return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });
  if (/http|www\.|\.com|\.id|\.net/i.test(message)) return NextResponse.json({ error: "Link tidak diizinkan" }, { status: 400 });
  const [m] = await db.insert(chatMessages).values({ userId: u.id, username: u.displayName, message, channel: "global" }).returning();
  return NextResponse.json({ message: m });
}
