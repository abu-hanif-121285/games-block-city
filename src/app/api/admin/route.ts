import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, auditLog, cityStats, blocks, transactions } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (!u.isAdmin) return NextResponse.json({ error: "Khusus admin" }, { status: 403 });
  const allUsers = await db.select({ id: users.id, username: users.username, displayName: users.displayName, balance: users.balance, level: users.level, job: users.job, isAdmin: users.isAdmin, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(50);
  const logs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(50);
  const blockCount = await db.select({ n: sql<number>`count(*)` }).from(blocks);
  const tx = await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(30);
  const stats = await db.select().from(cityStats).limit(1);
  return NextResponse.json({ users: allUsers, logs, blockCount: Number(blockCount[0]?.n ?? 0), transactions: tx, stats: stats[0] ?? null });
}

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u || !u.isAdmin) return NextResponse.json({ error: "Khusus admin" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action === "set_treasury") {
    const treasury = Number(body.treasury);
    if (!Number.isInteger(treasury)) return NextResponse.json({ error: "Nilai tidak valid" }, { status: 400 });
    await db.update(cityStats).set({ treasury, updatedAt: new Date() }).where(sql`${cityStats.id} = 1`);
    await db.insert(auditLog).values({ userId: u.id, action: "admin_treasury", details: `Treasury -> ${treasury}` });
    return NextResponse.json({ ok: true });
  }
  if (action === "grant") {
    const userId = String(body.userId || "");
    const amount = Number(body.amount || 0);
    if (!userId || !Number.isInteger(amount) || Math.abs(amount) > 100000) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    const rows = await db.select().from(users).where(sql`${users.id} = ${userId}`).limit(1);
    if (!rows.length) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    const newBalance = rows[0].balance + amount;
    if (newBalance < 0) return NextResponse.json({ error: "Saldo negatif" }, { status: 400 });
    await db.update(users).set({ balance: newBalance }).where(sql`${users.id} = ${userId}`);
    await db.insert(transactions).values({ userId, amount, type: "adjust", description: "Admin grant", balanceAfter: newBalance });
    await db.insert(auditLog).values({ userId: u.id, action: "admin_grant", details: `${amount} BC ke ${userId}` });
    return NextResponse.json({ ok: true, balance: newBalance });
  }
  return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
}
