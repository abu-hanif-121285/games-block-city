import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { presence, users } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const cutoff = new Date(Date.now() - 30 * 1000);
  const rows = await db.select({ presence, user: users }).from(presence).innerJoin(users, eq(presence.userId, users.id)).where(gt(presence.updatedAt, cutoff));
  return NextResponse.json({ players: rows.map(r => ({ userId: r.user.id, displayName: r.user.displayName, username: r.user.username, skinColor: r.user.skinColor, hairColor: r.user.hairColor, hairStyle: r.user.hairStyle, shirtColor: r.user.shirtColor, pantsColor: r.user.pantsColor, hat: r.user.hat, gender: r.user.gender, job: r.user.job, level: r.user.level, x: r.presence.x, y: r.presence.y, z: r.presence.z, rot: r.presence.rot, inVehicle: r.presence.inVehicle, vehicleId: r.presence.vehicleId })) });
}

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const x = Number(body.x), y = Number(body.y), z = Number(body.z), rot = Number(body.rot || 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return NextResponse.json({ error: "Posisi tidak valid" }, { status: 400 });
  await db.insert(presence).values({ userId: u.id, x, y, z, rot, inVehicle: !!body.inVehicle, vehicleId: body.vehicleId || null, updatedAt: new Date() }).onConflictDoUpdate({ target: presence.userId, set: { x, y, z, rot, inVehicle: !!body.inVehicle, vehicleId: body.vehicleId || null, updatedAt: new Date() } });
  await db.update(users).set({ lastSeen: new Date() }).where(eq(users.id, u.id));
  return NextResponse.json({ ok: true });
}
