import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blocks, properties, auditLog, cityStats } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { districtOf, WORLD_SIZE } from "@/lib/game-data";

async function seedWorld() {
  const count = await db.select({ n: sql<number>`count(*)` }).from(blocks);
  if (Number(count[0]?.n ?? 0) > 0) return;
  const rows: { x: number; y: number; z: number; type: string; district: string }[] = [];
  const put = (x: number, y: number, z: number, type: string) => rows.push({ x, y, z, type, district: districtOf(x, z) });
  // base grass layer
  for (let x = 0; x < WORLD_SIZE; x++) for (let z = 0; z < WORLD_SIZE; z++) {
    if (x % 8 === 4 || z % 8 === 4) put(x, 0, z, "road");
    else if (x % 8 === 5 || z % 8 === 5) put(x, 0, z, "sidewalk");
    else put(x, 0, z, "grass");
  }
  // district buildings
  const building = (bx: number, bz: number, w: number, d: number, h: number, wall: string, roof: string) => {
    for (let x = bx; x < bx + w; x++) for (let z = bz; z < bz + d; z++) {
      for (let y = 1; y <= h; y++) {
        const edge = x === bx || x === bx + w - 1 || z === bz || z === bz + d - 1;
        if (edge) put(x, y, z, wall);
        else if (y === h) put(x, y, z, roof);
      }
      put(bx, 1, bz, "door");
    }
  };
  building(2, 2, 6, 6, 4, "concrete", "roof");       // city center office
  building(10, 2, 5, 5, 3, "bank", "roof");          // bank
  building(18, 2, 6, 5, 3, "shop", "roof");          // business shop
  building(26, 2, 6, 6, 4, "hospital", "roof");      // hospital
  building(2, 10, 5, 5, 3, "house_wall", "roof");    // house
  building(10, 10, 5, 5, 3, "house_wall", "roof");   // house
  building(18, 10, 6, 6, 3, "school", "roof");       // school
  building(26, 10, 6, 5, 3, "police", "roof");       // police
  building(2, 18, 6, 5, 3, "factory", "roof");       // factory
  building(10, 18, 5, 5, 2, "shop", "roof");         // market
  building(18, 18, 6, 6, 2, "fire", "roof");         // fire station
  building(26, 18, 5, 5, 3, "house_wall", "roof");   // house
  building(2, 26, 5, 5, 3, "house_wall", "roof");
  building(10, 26, 6, 5, 3, "concrete", "roof");
  building(18, 26, 5, 5, 3, "house_wall", "roof");
  building(26, 26, 6, 6, 4, "concrete", "roof");
  building(34, 2, 6, 6, 3, "factory", "roof");
  building(42, 2, 5, 5, 3, "shop", "roof");
  building(50, 2, 6, 6, 4, "concrete", "roof");
  building(34, 10, 5, 5, 3, "house_wall", "roof");
  building(42, 10, 6, 5, 3, "school", "roof");
  building(50, 10, 5, 5, 3, "hospital", "roof");
  building(34, 18, 6, 5, 3, "factory", "roof");
  building(42, 18, 5, 5, 2, "shop", "roof");
  building(50, 18, 6, 6, 3, "concrete", "roof");
  building(34, 26, 5, 5, 3, "house_wall", "roof");
  building(42, 26, 6, 5, 3, "house_wall", "roof");
  building(50, 26, 5, 5, 3, "house_wall", "roof");
  // trees & lamps & flowers
  const treeSpots: [number, number][] = [[7, 7], [15, 7], [23, 7], [31, 7], [7, 15], [15, 15], [23, 15], [31, 15], [7, 23], [15, 23], [23, 23], [31, 23], [39, 7], [47, 7], [55, 7], [39, 15], [47, 15], [55, 15], [39, 23], [47, 23], [55, 23], [7, 31], [15, 31], [23, 31], [31, 31], [39, 31], [47, 31], [55, 31], [7, 39], [15, 39], [23, 39], [31, 39], [39, 39], [47, 39], [55, 39], [7, 47], [15, 47], [23, 47], [31, 47], [39, 47], [47, 47], [55, 47], [7, 55], [15, 55], [23, 55], [31, 55], [39, 55], [47, 55], [55, 55]];
  for (const [tx, tz] of treeSpots) {
    put(tx, 1, tz, "tree"); put(tx, 2, tz, "leaf"); put(tx, 3, tz, "leaf");
  }
  for (let i = 4; i < WORLD_SIZE; i += 8) for (let j = 4; j < WORLD_SIZE; j += 8) {
    put(i, 1, j + 2, "lamp");
  }
  for (let i = 0; i < 60; i++) {
    const fx = 1 + ((i * 7) % 60), fz = 1 + ((i * 11) % 60);
    if (!rows.some(r => r.x === fx && r.y === 1 && r.z === fz)) put(fx, 1, fz, "flower");
  }
  // water pond in recreation
  for (let x = 20; x < 24; x++) for (let z = 20; z < 24; z++) put(x, 1, z, "water");
  // batch insert
  for (let i = 0; i < rows.length; i += 400) {
    await db.insert(blocks).values(rows.slice(i, i + 400)).onConflictDoNothing();
  }
  await db.insert(cityStats).values({ id: 1, totalBlocks: rows.length, totalPlayers: 0, cityLevel: 1, treasury: 100000 }).onConflictDoNothing();
}

export async function GET() {
  await seedWorld();
  const all = await db.select().from(blocks).limit(8000);
  const stats = await db.select().from(cityStats).limit(1);
  return NextResponse.json({ blocks: all, stats: stats[0] ?? null });
}

export async function POST(req: NextRequest) {
  const u = await getCurrentUser(req);
  if (!u) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { x, y, z, type, action } = body;
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) return NextResponse.json({ error: "Koordinat tidak valid" }, { status: 400 });
  if (x < 0 || x >= WORLD_SIZE || z < 0 || z >= WORLD_SIZE || y < 0 || y > 18) return NextResponse.json({ error: "Di luar batas kota" }, { status: 400 });
  if (action === "place") {
    const validTypes = ["grass","dirt","stone","wood","plank","brick","concrete","glass","iron","roof","door","window","lamp","furniture","road","sidewalk","tree","leaf","water","sand","flower","hospital","police","fire","school","bank","shop","house_wall","factory"];
    if (!validTypes.includes(type)) return NextResponse.json({ error: "Tipe blok tidak valid" }, { status: 400 });
    // protection: cannot overwrite blocks owned by others unless admin or own property
    const existing = await db.select().from(blocks).where(and(eq(blocks.x, x), eq(blocks.y, y), eq(blocks.z, z))).limit(1);
    if (existing.length && existing[0].ownerId && existing[0].ownerId !== u.id && !u.isAdmin) {
      return NextResponse.json({ error: "Blok milik pemain lain — tidak boleh diubah" }, { status: 403 });
    }
    const district = districtOf(x, z);
    await db.insert(blocks).values({ x, y, z, type, ownerId: u.id, district }).onConflictDoUpdate({ target: [blocks.x, blocks.y, blocks.z], set: { type, ownerId: u.id, district, updatedAt: new Date() } });
    await db.insert(auditLog).values({ userId: u.id, action: "place_block", details: `${type} @ ${x},${y},${z}` });
    return NextResponse.json({ ok: true });
  }
  if (action === "remove") {
    const existing = await db.select().from(blocks).where(and(eq(blocks.x, x), eq(blocks.y, y), eq(blocks.z, z))).limit(1);
    if (existing.length && existing[0].ownerId && existing[0].ownerId !== u.id && !u.isAdmin) {
      return NextResponse.json({ error: "Tidak boleh menghapus milik pemain lain" }, { status: 403 });
    }
    await db.delete(blocks).where(and(eq(blocks.x, x), eq(blocks.y, y), eq(blocks.z, z)));
    await db.insert(auditLog).values({ userId: u.id, action: "remove_block", details: `@ ${x},${y},${z}` });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
}
