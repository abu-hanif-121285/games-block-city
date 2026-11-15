import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const type = String(body.type || "adjust");
  const description = String(body.description || "Transaksi").slice(0, 200);
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
  if (!["salary", "mission", "shop", "property", "vehicle", "transfer", "adjust", "sell"].includes(type)) return NextResponse.json({ error: "Tipe tidak valid" }, { status: 400 });
  const [fresh] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
  if (fresh.balance + amount < 0) return NextResponse.json({ error: "Saldo tidak cukup" }, { status: 400 });
  const newBalance = fresh.balance + amount;
  await db.update(users).set({ balance: newBalance }).where(eq(users.id, u.id));
  await db.insert(transactions).values({ userId: u.id, amount, type, description, balanceAfter: newBalance });
  await db.insert(auditLog).values({ userId: u.id, action: "economy", details: `${type} ${amount} BC — ${description}` });
  return NextResponse.json({ balance: newBalance });
}
