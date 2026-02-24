import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * SIS-Einträge Tabelle für die Strukturierte Informationssammlung
 */
export const sisEntries = mysqlTable("sis_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Kopfbereich - Stammdaten
  patientName: varchar("patientName", { length: 255 }).notNull(),
  birthDate: varchar("birthDate", { length: 20 }),
  conversationDate: varchar("conversationDate", { length: 20 }),
  nurseSignature: varchar("nurseSignature", { length: 255 }),
  relativeOrCaregiver: varchar("relativeOrCaregiver", { length: 255 }),
  
  // Pflegerelevante Diagnosen (als JSON-Array)
  // Format: [{ diagnose: string, auswirkungen: string }, ...]
  diagnosen: json("diagnosen"),
  
  // Feld A - O-Ton
  oTon: text("oTon"),
  
  // Themenfelder
  themenfeld1: text("themenfeld1"), // Kognitive und kommunikative Fähigkeiten
  themenfeld2: text("themenfeld2"), // Mobilität und Beweglichkeit
  themenfeld3: text("themenfeld3"), // Krankheitsbezogene Anforderungen und Belastungen
  themenfeld4: text("themenfeld4"), // Selbstversorgung
  themenfeld5: text("themenfeld5"), // Leben in sozialen Beziehungen
  themenfeld6: text("themenfeld6"), // Wohnen/Häuslichkeit
  
  // Risikomatrix als JSON
  // Format: { dekubitus: { tf1: {ja: bool, weitere: bool}, tf2: {...}, ... }, sturz: {...}, sonstiges: string }
  riskMatrix: json("riskMatrix"),
  
  // Generierter Maßnahmenplan
  massnahmenplan: text("massnahmenplan"),
  
  // Prüfungsergebnis
  pruefungsergebnis: text("pruefungsergebnis"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SisEntry = typeof sisEntries.$inferSelect;
export type InsertSisEntry = typeof sisEntries.$inferInsert;

/**
 * App-Einstellungen für API-Keys etc.
 */
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  settingKey: varchar("settingKey", { length: 100 }).notNull(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

/**
 * Globale App-Einstellungen (Admin-only)
 */
export const globalSettings = mysqlTable("global_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GlobalSetting = typeof globalSettings.$inferSelect;
export type InsertGlobalSetting = typeof globalSettings.$inferInsert;

/**
 * Textbausteine für Themenfelder
 */
export const textBlocks = mysqlTable("text_blocks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: mysqlEnum("category", [
    "mobilitaet",      // Mobilität und Bewegung
    "ernaehrung",      // Ernährung und Flüssigkeit
    "koerperpflege",   // Körperpflege und Hygiene
    "ausscheidung",    // Ausscheidung
    "kommunikation",   // Kommunikation und Kognition
    "soziales",        // Soziale Beziehungen
    "schmerz",         // Schmerzmanagement
    "medikation",      // Medikation
    "wundversorgung",  // Wundversorgung
    "allgemein"        // Allgemein verwendbar
  ]).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(), // Vordefinierte Bausteine
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TextBlock = typeof textBlocks.$inferSelect;
export type InsertTextBlock = typeof textBlocks.$inferInsert;

/**
 * Versionshistorie für Maßnahmenpläne
 */
export const planVersions = mysqlTable("plan_versions", {
  id: int("id").autoincrement().primaryKey(),
  sisEntryId: int("sisEntryId").notNull(), // Referenz zum SIS-Eintrag
  content: text("content").notNull(), // Inhalt des Maßnahmenplans
  versionNumber: int("versionNumber").notNull(), // Versionsnummer (1, 2, 3, ...)
  createdBy: int("createdBy").notNull(), // User ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlanVersion = typeof planVersions.$inferSelect;
export type InsertPlanVersion = typeof planVersions.$inferInsert;
