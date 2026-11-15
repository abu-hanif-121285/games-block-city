import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, properties, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { districtOf } from "@/lib/game-data";

export async function GET() {
  const all = await db.select().from(properties);
  return NextResponse.json({ properties: all });
}

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action === "buy") {
    const name = String(body.name || "Rumah Saya").slice(0, 40);
    const x = Number(body.x), z = Number(body.z);
    const price = Number(body.price || 10000);
    if (!Number.isInteger(x) || !Number.isInteger(z) || price <= 0 || price > 1000000) return NextResponse.json({ error: "Data properti tidak valid" }, { status: 400 });
    const [fresh] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    if (fresh.balance < price) return NextResponse.json({ error: "Saldo tidak cukup" }, { status: 400 });
    const newBalance = fresh.balance - price;
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, u.id));
    const [p] = await db.insert(properties).values({ ownerId: u.id, name, type: body.type || "house", district: districtOf(x, z), x, z, w: 8, d: 8, price, value: price, access: body.access || "private" }).returning();
    await db.insert(transactions).values({ userId: u.id, amount: -price, type: "property", description: `Beli ${name}`, balanceAfter: newBalance });
    return NextResponse.json({ property: p, balance: newBalance });
  }
  if (action === "sell") {
    const id = String(body.id || "");
    const rows = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    if (!rows.length || rows[0].ownerId !== u.id) return NextResponse.json({ error: "Properti tidak ditemukan" }, { status: 404 });
    const [fresh] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    const newBalance = fresh.balance + rows[0].value;
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, u.id));
    await db.delete(properties).where(eq(properties.id, id));
    await db.insert(transactions).values({ userId: u.id, amount: rows[0].value, type: "sell", description: `Jual ${rows[0].name}`, balanceAfter: newBalance });
    return NextResponse.json({ balance: newBalance });
  }
  return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
}
