import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, missionsProgress, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { MISSIONS } from "@/lib/game-data";

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const missionId = String(body.missionId || "");
  const m = MISSIONS.find(x => x.id === missionId);
  if (!m) return NextResponse.json({ error: "Misi tidak ditemukan" }, { status: 400 });
  const action = body.action;
  if (action === "accept") {
    const existing = await db.select().from(missionsProgress).where(and(eq(missionsProgress.userId, u.id), eq(missionsProgress.missionId, missionId))).limit(1);
    if (existing.length) return NextResponse.json({ error: "Misi sudah diterima" }, { status: 400 });
    await db.insert(missionsProgress).values({ userId: u.id, missionId, status: "active", progress: 0 });
    return NextResponse.json({ ok: true });
  }
  if (action === "complete") {
    const rows = await db.select().from(missionsProgress).where(and(eq(missionsProgress.userId, u.id), eq(missionsProgress.missionId, missionId))).limit(1);
    if (!rows.length || rows[0].status !== "active") return NextResponse.json({ error: "Misi belum aktif" }, { status: 400 });
    if (rows[0].rewardClaimed) return NextResponse.json({ error: "Reward sudah diklaim" }, { status: 400 });
    const [fresh] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    const newBalance = fresh.balance + m.reward;
    const newXp = fresh.xp + m.xp;
    const newLevel = Math.floor(newXp / 200) + 1;
    await db.update(users).set({ balance: newBalance, xp: newXp, level: newLevel }).where(eq(users.id, u.id));
    await db.update(missionsProgress).set({ status: "completed", progress: 100, rewardClaimed: true }).where(eq(missionsProgress.id, rows[0].id));
    await db.insert(transactions).values({ userId: u.id, amount: m.reward, type: "mission", description: `Misi: ${m.title}`, balanceAfter: newBalance });
    return NextResponse.json({ balance: newBalance, xp: newXp, level: newLevel, reward: m.reward });
  }
  return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
}
