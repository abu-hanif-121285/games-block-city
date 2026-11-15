import { pgTable, uuid, text, integer, boolean, timestamp, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  gender: text("gender").notNull().default("male"),
  skinColor: text("skin_color").notNull().default("#f2c79b"),
  hairColor: text("hair_color").notNull().default("#3b2f2f"),
  hairStyle: text("hair_style").notNull().default("short"),
  shirtColor: text("shirt_color").notNull().default("#2563eb"),
  pantsColor: text("pants_color").notNull().default("#1e293b"),
  hat: text("hat").notNull().default("none"),
  accessory: text("accessory").notNull().default("none"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  balance: integer("balance").notNull().default(5000),
  job: text("job"),
  jobLevel: integer("job_level").notNull().default(1),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blocks = pgTable("blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  z: integer("z").notNull(),
  type: text("type").notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  district: text("district").notNull().default("RESIDENTIAL"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("blocks_xyz_unique").on(t.x, t.y, t.z)]);

export const presence = pgTable("presence", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  x: doublePrecision("x").notNull().default(32),
  y: doublePrecision("y").notNull().default(2),
  z: doublePrecision("z").notNull().default(32),
  rot: doublePrecision("rot").notNull().default(0),
  inVehicle: boolean("in_vehicle").notNull().default(false),
  vehicleId: uuid("vehicle_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  username: text("username").notNull(),
  message: text("message").notNull(),
  channel: text("channel").notNull().default("global"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(1),
}, (t) => [uniqueIndex("inventory_user_item_unique").on(t.userId, t.itemId)]);

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("house"),
  district: text("district").notNull().default("RESIDENTIAL"),
  x: integer("x").notNull(),
  z: integer("z").notNull(),
  w: integer("w").notNull().default(8),
  d: integer("d").notNull().default(8),
  price: integer("price").notNull().default(10000),
  value: integer("value").notNull().default(10000),
  access: text("access").notNull().default("private"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehiclesOwned = pgTable("vehicles_owned", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vehicleType: text("vehicle_type").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#ef4444"),
  x: doublePrecision("x").notNull().default(32),
  z: doublePrecision("z").notNull().default(36),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const missionsProgress = pgTable("missions_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  missionId: text("mission_id").notNull(),
  status: text("status").notNull().default("available"),
  progress: integer("progress").notNull().default(0),
  rewardClaimed: boolean("reward_claimed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("missions_user_mission_unique").on(t.userId, t.missionId)]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cityStats = pgTable("city_stats", {
  id: integer("id").primaryKey(),
  totalBlocks: integer("total_blocks").notNull().default(0),
  totalPlayers: integer("total_players").notNull().default(0),
  cityLevel: integer("city_level").notNull().default(1),
  treasury: integer("treasury").notNull().default(100000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
