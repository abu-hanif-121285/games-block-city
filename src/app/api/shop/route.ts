import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventory, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { SHOP_ITEMS } from "@/lib/game-data";

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || "");
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 400 });
  const [fresh] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
  if (fresh.balance < item.price) return NextResponse.json({ error: "Saldo tidak cukup" }, { status: 400 });
  const newBalance = fresh.balance - item.price;
  await db.update(users).set({ balance: newBalance }).where(eq(users.id, u.id));
  const existing = await db.select().from(inventory).where(and(eq(inventory.userId, u.id), eq(inventory.itemId, itemId))).limit(1);
  if (existing.length) await db.update(inventory).set({ qty: existing[0].qty + 1 }).where(eq(inventory.id, existing[0].id));
  else await db.insert(inventory).values({ userId: u.id, itemId, name: item.name, qty: 1 });
  await db.insert(transactions).values({ userId: u.id, amount: -item.price, type: "shop", description: `Beli ${item.name}`, balanceAfter: newBalance });
  return NextResponse.json({ balance: newBalance, item });
}
