import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { JOBS } from "@/lib/game-data";

const lastWork = new Map<string, number>();

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action === "choose") {
    const jobId = String(body.jobId || "");
    const job = JOBS.find(j => j.id === jobId);
    if (!job) return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 400 });
    await db.update(users).set({ job: job.id, shirtColor: job.uniform }).where(eq(users.id, u.id));
    await db.insert(auditLog).values({ userId: u.id, action: "choose_job", details: job.name });
    const [updated] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    return NextResponse.json({ user: publicUser(updated), job });
  }
  if (action === "work") {
    if (!u.job) return NextResponse.json({ error: "Pilih pekerjaan dulu di Job Center" }, { status: 400 });
    const now = Date.now();
    const last = lastWork.get(u.id) || 0;
    if (now - last < 20000) return NextResponse.json({ error: `Tunggu ${Math.ceil((20000 - (now - last)) / 1000)} detik sebelum shift berikutnya` }, { status: 429 });
    lastWork.set(u.id, now);
    const job = JOBS.find(j => j.id === u.job);
    if (!job) return NextResponse.json({ error: "Pekerjaan tidak valid" }, { status: 400 });
    const [fresh] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    const newBalance = fresh.balance + job.salary;
    const newXp = fresh.xp + job.xp;
    const newLevel = Math.floor(newXp / 200) + 1;
    const newJobLevel = Math.floor(newXp / 100) + 1;
    await db.update(users).set({ balance: newBalance, xp: newXp, level: newLevel, jobLevel: newJobLevel }).where(eq(users.id, u.id));
    await db.insert(transactions).values({ userId: u.id, amount: job.salary, type: "salary", description: `Gaji ${job.name} (shift)`, balanceAfter: newBalance });
    await db.insert(auditLog).values({ userId: u.id, action: "work_shift", details: `${job.name} +${job.salary} BC +${job.xp} XP` });
    return NextResponse.json({ balance: newBalance, xp: newXp, level: newLevel, jobLevel: newJobLevel, salary: job.salary, xpGain: job.xp });
  }
  return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
}
