import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventory, transactions, properties, vehiclesOwned, missionsProgress } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser, publicUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const inv = await db.select().from(inventory).where(eq(inventory.userId, u.id));
  const tx = await db.select().from(transactions).where(eq(transactions.userId, u.id)).orderBy(desc(transactions.createdAt)).limit(30);
  const props = await db.select().from(properties).where(eq(properties.ownerId, u.id));
  const vehs = await db.select().from(vehiclesOwned).where(eq(vehiclesOwned.userId, u.id));
  const missions = await db.select().from(missionsProgress).where(eq(missionsProgress.userId, u.id));
  return NextResponse.json({ user: publicUser(u), inventory: inv, transactions: tx, properties: props, vehicles: vehs, missions });
}

export async function PATCH(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const allowed = ["displayName", "gender", "skinColor", "hairColor", "hairStyle", "shirtColor", "pantsColor", "hat", "accessory"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) patch[k] = String(body[k]).slice(0, 40);
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Tidak ada field" }, { status: 400 });
  const [updated] = await db.update(users).set(patch).where(eq(users.id, u.id)).returning();
  return NextResponse.json({ user: publicUser(updated) });
}
