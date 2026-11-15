import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, vehiclesOwned, transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { VEHICLES } from "@/lib/game-data";

export async function GET(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const all = await db.select().from(vehiclesOwned);
  return NextResponse.json({ vehicles: all });
}

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  if (action === "buy") {
    const vehicleType = String(body.vehicleType || "");
    const v = VEHICLES.find(x => x.id === vehicleType);
    if (!v) return NextResponse.json({ error: "Kendaraan tidak ditemukan" }, { status: 400 });
    const [fresh] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    if (fresh.balance < v.price) return NextResponse.json({ error: "Saldo tidak cukup" }, { status: 400 });
    const newBalance = fresh.balance - v.price;
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, u.id));
    const [veh] = await db.insert(vehiclesOwned).values({ userId: u.id, vehicleType, name: v.name, color: body.color || "#ef4444", x: 32, z: 36 }).returning();
    await db.insert(transactions).values({ userId: u.id, amount: -v.price, type: "vehicle", description: `Beli ${v.name}`, balanceAfter: newBalance });
    return NextResponse.json({ vehicle: veh, balance: newBalance });
  }
  if (action === "move") {
    const id = String(body.id || "");
    const x = Number(body.x), z = Number(body.z);
    if (!id || !Number.isFinite(x) || !Number.isFinite(z)) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    const rows = await db.select().from(vehiclesOwned).where(eq(vehiclesOwned.id, id)).limit(1);
    if (!rows.length) return NextResponse.json({ error: "Kendaraan tidak ditemukan" }, { status: 404 });
    if (rows[0].userId !== u.id && !u.isAdmin) return NextResponse.json({ error: "Bukan kendaraan Anda" }, { status: 403 });
    await db.update(vehiclesOwned).set({ x, z }).where(eq(vehiclesOwned.id, id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
}
