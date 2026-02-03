import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sisEntries, InsertSisEntry, SisEntry, appSettings, InsertAppSetting, globalSettings } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// SIS Entry functions
export async function createSisEntry(entry: InsertSisEntry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sisEntries).values(entry);
  return result[0].insertId;
}

export async function updateSisEntry(id: number, userId: number, entry: Partial<InsertSisEntry>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(sisEntries)
    .set(entry)
    .where(and(eq(sisEntries.id, id), eq(sisEntries.userId, userId)));
}

export async function getSisEntry(id: number, userId: number): Promise<SisEntry | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select()
    .from(sisEntries)
    .where(and(eq(sisEntries.id, id), eq(sisEntries.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function listSisEntries(userId: number): Promise<SisEntry[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(sisEntries)
    .where(eq(sisEntries.userId, userId))
    .orderBy(desc(sisEntries.updatedAt));
}

export async function deleteSisEntry(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(sisEntries)
    .where(and(eq(sisEntries.id, id), eq(sisEntries.userId, userId)));
}

// App Settings functions
export async function getSetting(userId: number, key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select()
    .from(appSettings)
    .where(and(eq(appSettings.userId, userId), eq(appSettings.settingKey, key)))
    .limit(1);
  
  return result.length > 0 ? result[0].settingValue : null;
}

export async function setSetting(userId: number, key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select()
    .from(appSettings)
    .where(and(eq(appSettings.userId, userId), eq(appSettings.settingKey, key)))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(appSettings)
      .set({ settingValue: value })
      .where(and(eq(appSettings.userId, userId), eq(appSettings.settingKey, key)));
  } else {
    await db.insert(appSettings).values({
      userId,
      settingKey: key,
      settingValue: value,
    });
  }
}

// Global Settings functions (Admin-only)
export async function getGlobalSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select()
    .from(globalSettings)
    .where(eq(globalSettings.settingKey, key))
    .limit(1);
  
  return result.length > 0 ? result[0].settingValue : null;
}

export async function setGlobalSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select()
    .from(globalSettings)
    .where(eq(globalSettings.settingKey, key))
    .limit(1);
  
  if (existing.length > 0) {
    await db.update(globalSettings)
      .set({ settingValue: value })
      .where(eq(globalSettings.settingKey, key));
  } else {
    await db.insert(globalSettings).values({
      settingKey: key,
      settingValue: value,
    });
  }
}
