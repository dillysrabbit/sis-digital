import { boolean, integer, json, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Enums
 */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const textBlockCategoryEnum = pgEnum("text_block_category", [
  "mobilitaet",
  "ernaehrung",
  "koerperpflege",
  "ausscheidung",
  "kommunikation",
  "soziales",
  "schmerz",
  "medikation",
  "wundversorgung",
  "allgemein",
]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * SIS-Einträge Tabelle für die Strukturierte Informationssammlung
 */
export const sisEntries = pgTable("sis_entries", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),

  // Kopfbereich - Stammdaten
  patientName: varchar("patientName", { length: 255 }).notNull(),
  birthDate: varchar("birthDate", { length: 20 }),
  conversationDate: varchar("conversationDate", { length: 20 }),
  nurseSignature: varchar("nurseSignature", { length: 255 }),
  relativeOrCaregiver: varchar("relativeOrCaregiver", { length: 255 }),

  // Pflegerelevante Diagnosen (als JSON-Array)
  diagnosen: json("diagnosen"),

  // Feld A - O-Ton
  oTon: text("oTon"),

  // Themenfelder
  themenfeld1: text("themenfeld1"),
  themenfeld2: text("themenfeld2"),
  themenfeld3: text("themenfeld3"),
  themenfeld4: text("themenfeld4"),
  themenfeld5: text("themenfeld5"),
  themenfeld6: text("themenfeld6"),

  // Risikomatrix als JSON
  riskMatrix: json("riskMatrix"),

  // Generierter Maßnahmenplan
  massnahmenplan: text("massnahmenplan"),

  // Prüfungsergebnis
  pruefungsergebnis: text("pruefungsergebnis"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SisEntry = typeof sisEntries.$inferSelect;
export type InsertSisEntry = typeof sisEntries.$inferInsert;

/**
 * App-Einstellungen für API-Keys etc.
 */
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  settingKey: varchar("settingKey", { length: 100 }).notNull(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

/**
 * Globale App-Einstellungen (Admin-only)
 */
export const globalSettings = pgTable("global_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GlobalSetting = typeof globalSettings.$inferSelect;
export type InsertGlobalSetting = typeof globalSettings.$inferInsert;

/**
 * Textbausteine für Themenfelder
 */
export const textBlocks = pgTable("text_blocks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: textBlockCategoryEnum("category").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TextBlock = typeof textBlocks.$inferSelect;
export type InsertTextBlock = typeof textBlocks.$inferInsert;

/**
 * Versionshistorie für Maßnahmenpläne
 */
export const planVersions = pgTable("plan_versions", {
  id: serial("id").primaryKey(),
  sisEntryId: integer("sisEntryId").notNull(),
  content: text("content").notNull(),
  versionNumber: integer("versionNumber").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlanVersion = typeof planVersions.$inferSelect;
export type InsertPlanVersion = typeof planVersions.$inferInsert;
