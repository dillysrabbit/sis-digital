// server/api-handler.ts
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123"
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/db.ts
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import { boolean, integer, json, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin"]);
var textBlockCategoryEnum = pgEnum("text_block_category", [
  "mobilitaet",
  "ernaehrung",
  "koerperpflege",
  "ausscheidung",
  "kommunikation",
  "soziales",
  "schmerz",
  "medikation",
  "wundversorgung",
  "allgemein"
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var sisEntries = pgTable("sis_entries", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  settingKey: varchar("settingKey", { length: 100 }).notNull(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var globalSettings = pgTable("global_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var textBlocks = pgTable("text_blocks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: textBlockCategoryEnum("category").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var planVersions = pgTable("plan_versions", {
  id: serial("id").primaryKey(),
  sisEntryId: integer("sisEntryId").notNull(),
  content: text("content").notNull(),
  versionNumber: integer("versionNumber").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function promoteUserToAdmin(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role: "admin", updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}
async function createSisEntry(entry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sisEntries).values(entry).returning({ id: sisEntries.id });
  return result[0].id;
}
async function updateSisEntry(id, userId, entry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sisEntries).set({ ...entry, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(sisEntries.id, id), eq(sisEntries.userId, userId)));
}
async function getSisEntry(id, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(sisEntries).where(and(eq(sisEntries.id, id), eq(sisEntries.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function listSisEntries(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(sisEntries).where(eq(sisEntries.userId, userId)).orderBy(desc(sisEntries.updatedAt));
}
async function deleteSisEntry(id, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sisEntries).where(and(eq(sisEntries.id, id), eq(sisEntries.userId, userId)));
}
async function getGlobalSetting(key) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(globalSettings).where(eq(globalSettings.settingKey, key)).limit(1);
  return result.length > 0 ? result[0].settingValue : null;
}
async function setGlobalSetting(key, value) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(globalSettings).where(eq(globalSettings.settingKey, key)).limit(1);
  if (existing.length > 0) {
    await db.update(globalSettings).set({ settingValue: value, updatedAt: /* @__PURE__ */ new Date() }).where(eq(globalSettings.settingKey, key));
  } else {
    await db.insert(globalSettings).values({
      settingKey: key,
      settingValue: value
    });
  }
}
async function getAllTextBlocks() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(textBlocks).orderBy(desc(textBlocks.createdAt));
}
async function getTextBlocksByCategory(category) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(textBlocks).where(eq(textBlocks.category, category)).orderBy(desc(textBlocks.createdAt));
}
async function getTextBlockById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(textBlocks).where(eq(textBlocks.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createTextBlock(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(textBlocks).values(data).returning({ id: textBlocks.id });
  return result[0].id;
}
async function updateTextBlock(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(textBlocks).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(textBlocks.id, id));
}
async function deleteTextBlock(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(textBlocks).where(eq(textBlocks.id, id));
}
async function savePlanVersion(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existingVersions = await db.select().from(planVersions).where(eq(planVersions.sisEntryId, data.sisEntryId)).orderBy(desc(planVersions.versionNumber));
  const nextVersion = existingVersions.length > 0 ? existingVersions[0].versionNumber + 1 : 1;
  const result = await db.insert(planVersions).values({
    sisEntryId: data.sisEntryId,
    content: data.content,
    versionNumber: nextVersion,
    createdBy: data.createdBy
  }).returning({ id: planVersions.id });
  return result[0].id;
}
async function getPlanVersions(sisEntryId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planVersions).where(eq(planVersions.sisEntryId, sisEntryId)).orderBy(desc(planVersions.createdAt));
}
async function getPlanVersion(versionId) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(planVersions).where(eq(planVersions.id, versionId)).limit(1);
  return results[0] || null;
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/pdfGenerator.ts
function escapeHtml(text2) {
  return text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function markdownToHtml(text2) {
  if (!text2) return "";
  let html = escapeHtml(text2);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.split("\n\n").map((p) => {
    if (p.startsWith("<h") || p.startsWith("<ul") || p.startsWith("<ol")) {
      return p;
    }
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
  return html;
}
function formatDate(dateStr) {
  if (!dateStr) return "Nicht angegeben";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}
function generateRiskMatrixHtml(riskMatrix) {
  if (!riskMatrix || typeof riskMatrix !== "object") {
    return "<p><em>Keine Risikomatrix ausgef\xFCllt</em></p>";
  }
  const matrix = riskMatrix;
  const risks = [
    { key: "dekubitus", label: "Dekubitus" },
    { key: "sturz", label: "Sturz" },
    { key: "inkontinenz", label: "Inkontinenz" },
    { key: "schmerz", label: "Schmerz" },
    { key: "ernaehrung", label: "Ern\xE4hrung" },
    { key: "sonstiges", label: "Sonstiges" }
  ];
  const tfLabels = [
    "TF1: Kognition/Kommunikation",
    "TF2: Mobilit\xE4t",
    "TF3: Krankheitsbezogen",
    "TF4: Selbstversorgung",
    "TF5: Soziale Beziehungen"
  ];
  let html = `
    <table class="risk-matrix">
      <thead>
        <tr>
          <th>Themenfeld</th>
          ${risks.map((r) => `<th>${r.label}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;
  for (let i = 0; i < 5; i++) {
    const tfKey = `tf${i + 1}`;
    html += `<tr><td>${tfLabels[i]}</td>`;
    for (const risk of risks) {
      const riskData = matrix[risk.key];
      const tfData = riskData?.[tfKey];
      const ja = tfData?.ja ? "\u2713" : "\u2013";
      const weitere = tfData?.weitere ? "(w)" : "";
      html += `<td class="center">${ja} ${weitere}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  html += '<p class="legend"><small>\u2713 = Risiko identifiziert, (w) = weitere Einsch\xE4tzung notwendig</small></p>';
  return html;
}
function generateSisPdfHtml(entry) {
  const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>SIS - ${escapeHtml(entry.patientName)}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      margin: 0;
      padding: 0;
    }
    
    .header {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      padding: 15px 20px;
      margin: -15mm -15mm 20px -15mm;
      page-break-inside: avoid;
    }
    
    .header h1 {
      margin: 0 0 5px 0;
      font-size: 18pt;
    }
    
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 9pt;
    }
    
    .meta-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    
    .meta-label {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    
    .meta-value {
      font-weight: 600;
      color: #1e293b;
    }
    
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .section-header {
      padding: 8px 12px;
      border-radius: 6px 6px 0 0;
      margin-bottom: 0;
    }
    
    .section-header h2 {
      margin: 0;
      font-size: 11pt;
      font-weight: 600;
    }
    
    .section-content {
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 6px 6px;
      padding: 12px;
      background: white;
    }
    
    .section-content p {
      margin: 0;
      white-space: pre-wrap;
    }
    
    /* O-Ton - Rot */
    .oton .section-header {
      background: #dc2626;
      color: white;
    }
    
    /* Themenfeld 1 - Orange */
    .tf1 .section-header {
      background: #f97316;
      color: white;
    }
    
    /* Themenfeld 2 - Gelb */
    .tf2 .section-header {
      background: #eab308;
      color: #1e293b;
    }
    
    /* Themenfeld 3 - Gr\xFCn */
    .tf3 .section-header {
      background: #16a34a;
      color: white;
    }
    
    /* Themenfeld 4 - Lila */
    .tf4 .section-header {
      background: #9333ea;
      color: white;
    }
    
    /* Themenfeld 5 - Blau */
    .tf5 .section-header {
      background: #2563eb;
      color: white;
    }
    
    /* Themenfeld 6 - T\xFCrkis */
    .tf6 .section-header {
      background: #0891b2;
      color: white;
    }
    
    /* Risikomatrix */
    .risk-matrix {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-top: 10px;
    }
    
    .risk-matrix th,
    .risk-matrix td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
    }
    
    .risk-matrix th {
      background: #f1f5f9;
      font-weight: 600;
      font-size: 8pt;
    }
    
    .risk-matrix td.center {
      text-align: center;
    }
    
    .legend {
      margin-top: 8px;
      color: #64748b;
    }
    
    /* Ma\xDFnahmenplan */
    .massnahmenplan .section-header {
      background: #059669;
      color: white;
    }
    
    .massnahmenplan .section-content {
      background: #f0fdf4;
    }
    
    /* Pr\xFCfungsergebnis */
    .pruefung .section-header {
      background: #ea580c;
      color: white;
    }
    
    .pruefung .section-content {
      background: #fff7ed;
    }
    
    /* Content formatting */
    .section-content h2 {
      font-size: 12pt;
      margin: 15px 0 8px 0;
      color: #1e293b;
    }
    
    .section-content h3 {
      font-size: 11pt;
      margin: 12px 0 6px 0;
      color: #334155;
    }
    
    .section-content h4 {
      font-size: 10pt;
      margin: 10px 0 5px 0;
      color: #475569;
    }
    
    .section-content ul {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .section-content li {
      margin-bottom: 4px;
    }
    
    .empty-field {
      color: #94a3b8;
      font-style: italic;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #64748b;
      text-align: center;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Strukturierte Informationssammlung (SIS)</h1>
    <p>Station\xE4re Pflege \u2022 Erstellt am ${currentDate}</p>
  </div>
  
  <div class="meta-info">
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Name der pflegebed\xFCrftigen Person</span>
        <span class="meta-value">${escapeHtml(entry.patientName)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Geburtsdatum</span>
        <span class="meta-value">${formatDate(entry.birthDate)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Gespr\xE4ch am</span>
        <span class="meta-value">${formatDate(entry.conversationDate)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Pflegefachkraft</span>
        <span class="meta-value">${entry.nurseSignature ? escapeHtml(entry.nurseSignature) : "Nicht angegeben"}</span>
      </div>
      <div class="meta-item" style="grid-column: span 2;">
        <span class="meta-label">Angeh\xF6riger/Betreuer</span>
        <span class="meta-value">${entry.relativeOrCaregiver ? escapeHtml(entry.relativeOrCaregiver) : "Nicht angegeben"}</span>
      </div>
    </div>
  </div>
  
  <div class="section oton">
    <div class="section-header">
      <h2>Feld A \u2013 O-Ton: Was bewegt Sie? Was brauchen Sie?</h2>
    </div>
    <div class="section-content">
      ${entry.oTon ? `<p>${escapeHtml(entry.oTon)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf1">
    <div class="section-header">
      <h2>Themenfeld 1 \u2013 Kognitive und kommunikative F\xE4higkeiten</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld1 ? `<p>${escapeHtml(entry.themenfeld1)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf2">
    <div class="section-header">
      <h2>Themenfeld 2 \u2013 Mobilit\xE4t und Beweglichkeit</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld2 ? `<p>${escapeHtml(entry.themenfeld2)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf3">
    <div class="section-header">
      <h2>Themenfeld 3 \u2013 Krankheitsbezogene Anforderungen und Belastungen</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld3 ? `<p>${escapeHtml(entry.themenfeld3)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf4">
    <div class="section-header">
      <h2>Themenfeld 4 \u2013 Selbstversorgung</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld4 ? `<p>${escapeHtml(entry.themenfeld4)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf5">
    <div class="section-header">
      <h2>Themenfeld 5 \u2013 Leben in sozialen Beziehungen</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld5 ? `<p>${escapeHtml(entry.themenfeld5)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section tf6">
    <div class="section-header">
      <h2>Themenfeld 6 \u2013 Wohnen/H\xE4uslichkeit</h2>
    </div>
    <div class="section-content">
      ${entry.themenfeld6 ? `<p>${escapeHtml(entry.themenfeld6)}</p>` : '<p class="empty-field">Keine Angaben</p>'}
    </div>
  </div>
  
  <div class="section">
    <div class="section-header" style="background: #64748b; color: white;">
      <h2>Risikomatrix \u2013 Erste fachliche Einsch\xE4tzung</h2>
    </div>
    <div class="section-content">
      ${generateRiskMatrixHtml(entry.riskMatrix)}
    </div>
  </div>
  
  ${entry.massnahmenplan ? `
  <div class="page-break"></div>
  <div class="section massnahmenplan">
    <div class="section-header">
      <h2>Individueller Ma\xDFnahmenplan</h2>
    </div>
    <div class="section-content">
      ${markdownToHtml(entry.massnahmenplan)}
    </div>
  </div>
  ` : ""}
  
  ${entry.pruefungsergebnis ? `
  <div class="section pruefung">
    <div class="section-header">
      <h2>SIS-Pr\xFCfungsergebnis</h2>
    </div>
    <div class="section-content">
      ${markdownToHtml(entry.pruefungsergebnis)}
    </div>
  </div>
  ` : ""}
  
  <div class="footer">
    <p>Dieses Dokument wurde mit SIS Digital erstellt \u2022 ${currentDate}</p>
    <p>Strukturierte Informationssammlung nach dem Strukturmodell</p>
  </div>
</body>
</html>
`;
}

// server/routers.ts
var AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Schnell und leistungsstark" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", description: "H\xF6chste Qualit\xE4t und Reasoning" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Schnell und kosteng\xFCnstig" }
];
var DEFAULT_MODEL = "claude-sonnet-4-6";
var DEFAULT_SYSTEM_PROMPT = `Du bist ein erfahrener Pflegeexperte und erstellst individuelle Ma\xDFnahmenpl\xE4ne basierend auf der Strukturierten Informationssammlung (SIS). 
                
Erstelle einen detaillierten, praxisnahen Ma\xDFnahmenplan, der:
- Auf die individuellen Bed\xFCrfnisse und Ressourcen der pflegebed\xFCrftigen Person eingeht
- Konkrete, umsetzbare Ma\xDFnahmen f\xFCr jedes relevante Themenfeld enth\xE4lt
- Die identifizierten Risiken ber\xFCcksichtigt
- Die W\xFCnsche und Perspektive der pflegebed\xFCrftigen Person (O-Ton) einbezieht
- Professionell und verst\xE4ndlich formuliert ist

Strukturiere den Ma\xDFnahmenplan nach Themenfeldern und priorisiere nach Dringlichkeit.`;
var DEFAULT_CHECK_PROMPT = `Du bist ein erfahrener Pflegeexperte und Qualit\xE4tsbeauftragter. Deine Aufgabe ist es, die Strukturierte Informationssammlung (SIS) auf Vollst\xE4ndigkeit, Plausibilit\xE4t und fachliche Qualit\xE4t zu pr\xFCfen.

Pr\xFCfe die SIS auf folgende Aspekte:

1. **Vollst\xE4ndigkeit**: Sind alle relevanten Themenfelder ausgef\xFCllt? Fehlen wichtige Informationen?

2. **Plausibilit\xE4t**: Passen die Angaben zueinander? Gibt es Widerspr\xFCche zwischen den Themenfeldern?

3. **Risikomatrix**: Sind die identifizierten Risiken nachvollziehbar? Wurden Risiken m\xF6glicherweise \xFCbersehen?

4. **O-Ton**: Ist die Perspektive der pflegebed\xFCrftigen Person ausreichend dokumentiert?

5. **Fachliche Qualit\xE4t**: Sind die Einsch\xE4tzungen fachlich korrekt und nachvollziehbar formuliert?

Gib konstruktives Feedback mit konkreten Verbesserungsvorschl\xE4gen. Strukturiere deine R\xFCckmeldung nach den Pr\xFCfaspekten.`;
var PROMPT_TEMPLATES = [
  {
    id: "standard",
    name: "Standard (Ausf\xFChrlich)",
    description: "Detaillierter Ma\xDFnahmenplan mit allen Themenfeldern",
    prompt: DEFAULT_SYSTEM_PROMPT
  },
  {
    id: "kompakt",
    name: "Kompakt",
    description: "K\xFCrzerer, \xFCbersichtlicher Ma\xDFnahmenplan",
    prompt: `Du bist ein erfahrener Pflegeexperte. Erstelle einen kompakten, \xFCbersichtlichen Ma\xDFnahmenplan basierend auf der SIS.

Der Plan soll:
- Maximal 1-2 Seiten umfassen
- Die wichtigsten Ma\xDFnahmen pro Themenfeld in Stichpunkten auflisten
- Priorit\xE4ten klar kennzeichnen (hoch/mittel/niedrig)
- Sofort umsetzbar und praxisnah sein

Verzichte auf ausf\xFChrliche Erkl\xE4rungen und fokussiere dich auf konkrete Handlungsanweisungen.`
  },
  {
    id: "risikofokussiert",
    name: "Risikofokussiert",
    description: "Schwerpunkt auf identifizierte Risiken und Pr\xE4vention",
    prompt: `Du bist ein erfahrener Pflegeexperte mit Spezialisierung auf Risikopr\xE4vention. Erstelle einen Ma\xDFnahmenplan mit besonderem Fokus auf die identifizierten Risiken.

Der Plan soll:
- Jeden identifizierten Risikobereich (Dekubitus, Sturz, Inkontinenz, Schmerz, Ern\xE4hrung) einzeln adressieren
- Konkrete pr\xE4ventive Ma\xDFnahmen f\xFCr jedes Risiko benennen
- Fr\xFChwarnzeichen und Eskalationskriterien definieren
- Regelm\xE4\xDFige \xDCberpr\xFCfungsintervalle vorschlagen
- Die Ressourcen der pflegebed\xFCrftigen Person in die Pr\xE4vention einbeziehen

Strukturiere den Plan nach Risikobereichen, nicht nach Themenfeldern.`
  },
  {
    id: "ressourcenorientiert",
    name: "Ressourcenorientiert",
    description: "Fokus auf F\xE4higkeiten und Selbstst\xE4ndigkeit",
    prompt: `Du bist ein erfahrener Pflegeexperte mit ressourcenorientiertem Ansatz. Erstelle einen Ma\xDFnahmenplan, der die vorhandenen F\xE4higkeiten und Ressourcen der pflegebed\xFCrftigen Person in den Mittelpunkt stellt.

Der Plan soll:
- Vorhandene F\xE4higkeiten und St\xE4rken hervorheben
- Ma\xDFnahmen zur F\xF6rderung der Selbstst\xE4ndigkeit priorisieren
- Aktivierende Pflege in den Vordergrund stellen
- Die W\xFCnsche und Ziele der Person (O-Ton) ber\xFCcksichtigen
- Unterst\xFCtzung nur dort vorsehen, wo sie wirklich n\xF6tig ist

Formuliere positiv und st\xE4rkenorientiert.`
  },
  {
    id: "angehoerige",
    name: "F\xFCr Angeh\xF6rige",
    description: "Verst\xE4ndlich formuliert f\xFCr Angeh\xF6rige und Betreuer",
    prompt: `Du bist ein erfahrener Pflegeexperte. Erstelle einen Ma\xDFnahmenplan, der auch f\xFCr Angeh\xF6rige und pflegende Laien verst\xE4ndlich ist.

Der Plan soll:
- Fachbegriffe vermeiden oder erkl\xE4ren
- Praktische Tipps f\xFCr den Alltag geben
- Klare, einfache Handlungsanweisungen enthalten
- Auf typische Fragen von Angeh\xF6rigen eingehen
- Entlastungsm\xF6glichkeiten f\xFCr pflegende Angeh\xF6rige aufzeigen
- Warnzeichen benennen, bei denen professionelle Hilfe geholt werden sollte

Schreibe in einer warmen, unterst\xFCtzenden Sprache.`
  }
];
var CHECK_PROMPT_TEMPLATES = [
  {
    id: "standard",
    name: "Standard-Pr\xFCfung",
    description: "Umfassende Pr\xFCfung aller Aspekte der SIS",
    prompt: DEFAULT_CHECK_PROMPT
  },
  {
    id: "schnellcheck",
    name: "Schnellcheck",
    description: "Kurze Pr\xFCfung auf die wichtigsten Punkte",
    prompt: `Du bist ein erfahrener Pflegeexperte. F\xFChre einen schnellen Qualit\xE4tscheck der SIS durch.

Pr\xFCfe kurz und pr\xE4gnant:
- Sind alle Pflichtfelder ausgef\xFCllt?
- Gibt es offensichtliche Widerspr\xFCche?
- Sind die Risiken plausibel eingesch\xE4tzt?

Gib eine kurze Zusammenfassung (max. 5 Punkte) mit den wichtigsten Hinweisen.`
  },
  {
    id: "mdkpruefung",
    name: "MDK-Pr\xFCfungsvorbereitung",
    description: "Pr\xFCfung nach MDK-Qualit\xE4tskriterien",
    prompt: `Du bist ein erfahrener Pflegeexperte mit Expertise in MDK-Qualit\xE4tspr\xFCfungen. Pr\xFCfe die SIS nach den Kriterien, die bei einer MDK-Pr\xFCfung relevant sind.

Achte besonders auf:
- Nachvollziehbarkeit der pflegefachlichen Einsch\xE4tzungen
- Dokumentation der individuellen Situation
- Ber\xFCcksichtigung aller relevanten Risikobereiche
- Einbeziehung der Perspektive der pflegebed\xFCrftigen Person
- Konsistenz zwischen Einsch\xE4tzung und Risikomatrix

Gib Hinweise, welche Aspekte bei einer MDK-Pr\xFCfung kritisch hinterfragt werden k\xF6nnten.`
  },
  {
    id: "risikofokus",
    name: "Risiko-Fokus",
    description: "Schwerpunkt auf Risikoeinsch\xE4tzung",
    prompt: `Du bist ein erfahrener Pflegeexperte mit Spezialisierung auf Risikopr\xE4vention. Pr\xFCfe die SIS mit besonderem Fokus auf die Risikoeinsch\xE4tzung.

Pr\xFCfe:
- Sind alle relevanten Risiken identifiziert?
- Passen die Risikoeinstufungen zu den dokumentierten Einsch\xE4tzungen?
- Wurden Risiken m\xF6glicherweise \xFCbersehen oder untersch\xE4tzt?
- Ist der Bedarf an weiterer Einsch\xE4tzung korrekt markiert?

Gib konkrete Empfehlungen zur Verbesserung der Risikoeinsch\xE4tzung.`
  },
  {
    id: "dokumentation",
    name: "Dokumentationsqualit\xE4t",
    description: "Pr\xFCfung der Dokumentationsqualit\xE4t",
    prompt: `Du bist ein erfahrener Pflegeexperte und Dokumentationsberater. Pr\xFCfe die SIS auf die Qualit\xE4t der Dokumentation.

Achte auf:
- Verst\xE4ndlichkeit und Klarheit der Formulierungen
- Vermeidung von Floskeln und Standardtexten
- Individuelle, personenbezogene Beschreibungen
- Nachvollziehbarkeit f\xFCr Dritte (z.B. Vertretungskr\xE4fte)
- Rechtliche Absicherung der Dokumentation

Gib Tipps zur Verbesserung der Dokumentationsqualit\xE4t.`
  }
];
var riskMatrixSchema = z2.object({
  dekubitus: z2.object({
    tf1: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf2: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf3: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf4: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf5: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional()
  }).optional(),
  sturz: z2.object({
    tf1: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf2: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf3: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf4: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf5: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional()
  }).optional(),
  inkontinenz: z2.object({
    tf1: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf2: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf3: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf4: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf5: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional()
  }).optional(),
  schmerz: z2.object({
    tf1: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf2: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf3: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf4: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf5: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional()
  }).optional(),
  ernaehrung: z2.object({
    tf1: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf2: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf3: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf4: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf5: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional()
  }).optional(),
  sonstiges: z2.object({
    title: z2.string().optional(),
    tf1: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf2: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf3: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf4: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional(),
    tf5: z2.object({ ja: z2.boolean(), weitere: z2.boolean() }).optional()
  }).optional()
}).optional();
var sisEntryInputSchema = z2.object({
  patientName: z2.string().min(1, "Name ist erforderlich"),
  birthDate: z2.string().optional(),
  conversationDate: z2.string().optional(),
  nurseSignature: z2.string().optional(),
  relativeOrCaregiver: z2.string().optional(),
  diagnosen: z2.array(z2.object({
    diagnose: z2.string(),
    auswirkungen: z2.string()
  })).optional(),
  oTon: z2.string().optional(),
  themenfeld1: z2.string().optional(),
  themenfeld2: z2.string().optional(),
  themenfeld3: z2.string().optional(),
  themenfeld4: z2.string().optional(),
  themenfeld5: z2.string().optional(),
  themenfeld6: z2.string().optional(),
  riskMatrix: riskMatrixSchema,
  massnahmenplan: z2.string().optional(),
  pruefungsergebnis: z2.string().optional()
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  sis: router({
    // Create new SIS entry
    create: protectedProcedure.input(sisEntryInputSchema).mutation(async ({ ctx, input }) => {
      const id = await createSisEntry({
        userId: ctx.user.id,
        ...input
      });
      return { id };
    }),
    // Update existing SIS entry
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      data: sisEntryInputSchema.partial()
    })).mutation(async ({ ctx, input }) => {
      await updateSisEntry(input.id, ctx.user.id, input.data);
      return { success: true };
    }),
    // Get single SIS entry
    get: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      return await getSisEntry(input.id, ctx.user.id);
    }),
    // List all SIS entries for user
    list: protectedProcedure.query(async ({ ctx }) => {
      return await listSisEntries(ctx.user.id);
    }),
    // Delete SIS entry
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      await deleteSisEntry(input.id, ctx.user.id);
      return { success: true };
    }),
    // Generate PDF HTML for export
    exportPdfHtml: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
      const entry = await getSisEntry(input.id, ctx.user.id);
      if (!entry) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "SIS-Eintrag nicht gefunden" });
      }
      const html = generateSisPdfHtml(entry);
      return { html, patientName: entry.patientName };
    }),
    // Generate Maßnahmenplan using Claude API
    generatePlan: protectedProcedure.input(z2.object({
      id: z2.number()
    })).mutation(async ({ ctx, input }) => {
      const entry = await getSisEntry(input.id, ctx.user.id);
      if (!entry) {
        throw new Error("SIS-Eintrag nicht gefunden");
      }
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("Kein Anthropic API-Key konfiguriert. Bitte ANTHROPIC_API_KEY Umgebungsvariable setzen.");
      }
      const prompt = buildSisPrompt(entry);
      const systemPrompt = await getGlobalSetting("system_prompt") || DEFAULT_SYSTEM_PROMPT;
      const selectedModel = await getGlobalSetting("anthropic_model") || DEFAULT_MODEL;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: selectedModel,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4096
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Anthropic API Fehler");
      }
      const data = await response.json();
      const plan = data.content?.[0]?.text || "";
      await updateSisEntry(input.id, ctx.user.id, { massnahmenplan: plan });
      await savePlanVersion({
        sisEntryId: input.id,
        content: plan,
        createdBy: ctx.user.id
      });
      return { plan };
    }),
    // Check SIS using Claude API (separate function)
    checkSis: protectedProcedure.input(z2.object({
      id: z2.number()
    })).mutation(async ({ ctx, input }) => {
      const entry = await getSisEntry(input.id, ctx.user.id);
      if (!entry) {
        throw new Error("SIS-Eintrag nicht gefunden");
      }
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("Kein Anthropic API-Key konfiguriert. Bitte ANTHROPIC_API_KEY Umgebungsvariable setzen.");
      }
      const prompt = buildSisPrompt(entry);
      const systemPrompt = await getGlobalSetting("check_system_prompt") || DEFAULT_CHECK_PROMPT;
      const selectedModel = await getGlobalSetting("check_anthropic_model") || DEFAULT_MODEL;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: selectedModel,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4096
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Anthropic API Fehler");
      }
      const data = await response.json();
      const result = data.content?.[0]?.text || "";
      await updateSisEntry(input.id, ctx.user.id, { pruefungsergebnis: result });
      return { result };
    })
  }),
  settings: router({}),
  // Admin-only routes
  admin: router({
    // Check if user is admin
    isAdmin: protectedProcedure.query(({ ctx }) => {
      return ctx.user.role === "admin";
    }),
    // Verify admin password and promote user to admin
    verifyAdminPassword: protectedProcedure.input(z2.object({ password: z2.string() })).mutation(async ({ ctx, input }) => {
      if (input.password !== ENV.adminPassword) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Falsches Passwort" });
      }
      await promoteUserToAdmin(ctx.user.id);
      return { success: true };
    }),
    // TEMPORARY: Promote current user to admin (remove after use)
    promoteToAdmin: protectedProcedure.mutation(async ({ ctx }) => {
      await promoteUserToAdmin(ctx.user.id);
      return { success: true, message: `User ${ctx.user.name} (ID: ${ctx.user.id}) wurde zum Admin bef\xF6rdert` };
    }),
    // ============ MAASSNAHMENPLAN SETTINGS ============
    // Get system prompt for Maßnahmenplan
    getSystemPrompt: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const prompt = await getGlobalSetting("system_prompt");
      return prompt || DEFAULT_SYSTEM_PROMPT;
    }),
    // Save system prompt for Maßnahmenplan
    setSystemPrompt: protectedProcedure.input(z2.object({ prompt: z2.string().min(1, "Prompt darf nicht leer sein") })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      await setGlobalSetting("system_prompt", input.prompt);
      return { success: true };
    }),
    // Reset to default prompt for Maßnahmenplan
    resetSystemPrompt: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      await setGlobalSetting("system_prompt", DEFAULT_SYSTEM_PROMPT);
      return { success: true, prompt: DEFAULT_SYSTEM_PROMPT };
    }),
    // Get available models
    getModels: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      return AVAILABLE_MODELS;
    }),
    // Get selected model for Maßnahmenplan
    getSelectedModel: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const model = await getGlobalSetting("anthropic_model");
      return model || DEFAULT_MODEL;
    }),
    // Set selected model for Maßnahmenplan
    setModel: protectedProcedure.input(z2.object({ model: z2.string() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const validModels = AVAILABLE_MODELS.map((m) => m.id);
      if (!validModels.includes(input.model)) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Ung\xFCltiges Modell" });
      }
      await setGlobalSetting("anthropic_model", input.model);
      return { success: true };
    }),
    // Get prompt templates for Maßnahmenplan
    getPromptTemplates: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      return PROMPT_TEMPLATES;
    }),
    // Apply a prompt template for Maßnahmenplan
    applyTemplate: protectedProcedure.input(z2.object({ templateId: z2.string() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const template = PROMPT_TEMPLATES.find((t2) => t2.id === input.templateId);
      if (!template) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Vorlage nicht gefunden" });
      }
      await setGlobalSetting("system_prompt", template.prompt);
      return { success: true, prompt: template.prompt };
    }),
    // ============ SIS-PRÜFUNG SETTINGS ============
    // Get system prompt for SIS-Prüfung
    getCheckSystemPrompt: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const prompt = await getGlobalSetting("check_system_prompt");
      return prompt || DEFAULT_CHECK_PROMPT;
    }),
    // Save system prompt for SIS-Prüfung
    setCheckSystemPrompt: protectedProcedure.input(z2.object({ prompt: z2.string().min(1, "Prompt darf nicht leer sein") })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      await setGlobalSetting("check_system_prompt", input.prompt);
      return { success: true };
    }),
    // Reset to default prompt for SIS-Prüfung
    resetCheckSystemPrompt: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      await setGlobalSetting("check_system_prompt", DEFAULT_CHECK_PROMPT);
      return { success: true, prompt: DEFAULT_CHECK_PROMPT };
    }),
    // Get selected model for SIS-Prüfung
    getCheckSelectedModel: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const model = await getGlobalSetting("check_anthropic_model");
      return model || DEFAULT_MODEL;
    }),
    // Set selected model for SIS-Prüfung
    setCheckModel: protectedProcedure.input(z2.object({ model: z2.string() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const validModels = AVAILABLE_MODELS.map((m) => m.id);
      if (!validModels.includes(input.model)) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Ung\xFCltiges Modell" });
      }
      await setGlobalSetting("check_anthropic_model", input.model);
      return { success: true };
    }),
    // Get prompt templates for SIS-Prüfung
    getCheckPromptTemplates: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      return CHECK_PROMPT_TEMPLATES;
    }),
    // Apply a prompt template for SIS-Prüfung
    applyCheckTemplate: protectedProcedure.input(z2.object({ templateId: z2.string() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
      }
      const template = CHECK_PROMPT_TEMPLATES.find((t2) => t2.id === input.templateId);
      if (!template) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Vorlage nicht gefunden" });
      }
      await setGlobalSetting("check_system_prompt", template.prompt);
      return { success: true, prompt: template.prompt };
    })
  }),
  // Textbausteine Router
  textBlocks: router({
    // Liste aller Textbausteine
    list: protectedProcedure.query(async () => {
      return await getAllTextBlocks();
    }),
    // Textbausteine nach Kategorie filtern
    byCategory: protectedProcedure.input(z2.object({ category: z2.string() })).query(async ({ input }) => {
      return await getTextBlocksByCategory(input.category);
    }),
    // Einzelnen Textbaustein abrufen
    get: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const block = await getTextBlockById(input.id);
      if (!block) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Textbaustein nicht gefunden" });
      }
      return block;
    }),
    // Neuen Textbaustein erstellen (nur Admin)
    create: protectedProcedure.input(z2.object({
      title: z2.string().min(1),
      content: z2.string().min(1),
      category: z2.enum(["mobilitaet", "ernaehrung", "koerperpflege", "ausscheidung", "kommunikation", "soziales", "schmerz", "medikation", "wundversorgung", "allgemein"]),
      isDefault: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren k\xF6nnen Textbausteine erstellen" });
      }
      const id = await createTextBlock(input);
      return { success: true, id };
    }),
    // Textbaustein aktualisieren (nur Admin)
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().min(1).optional(),
      content: z2.string().min(1).optional(),
      category: z2.enum(["mobilitaet", "ernaehrung", "koerperpflege", "ausscheidung", "kommunikation", "soziales", "schmerz", "medikation", "wundversorgung", "allgemein"]).optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren k\xF6nnen Textbausteine bearbeiten" });
      }
      const { id, ...data } = input;
      await updateTextBlock(id, data);
      return { success: true };
    }),
    // Textbaustein löschen (nur Admin)
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Nur Administratoren k\xF6nnen Textbausteine l\xF6schen" });
      }
      await deleteTextBlock(input.id);
      return { success: true };
    })
  }),
  // Maßnahmenplan-Versionen
  planVersions: router({
    // Alle Versionen eines Maßnahmenplans abrufen
    list: protectedProcedure.input(z2.object({ sisEntryId: z2.number() })).query(async ({ ctx, input }) => {
      const entry = await getSisEntry(input.sisEntryId, ctx.user.id);
      if (!entry) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "SIS-Eintrag nicht gefunden" });
      }
      return await getPlanVersions(input.sisEntryId);
    }),
    // Spezifische Version abrufen
    get: protectedProcedure.input(z2.object({ versionId: z2.number() })).query(async ({ ctx, input }) => {
      const version = await getPlanVersion(input.versionId);
      if (!version) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Version nicht gefunden" });
      }
      const entry = await getSisEntry(version.sisEntryId, ctx.user.id);
      if (!entry) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Kein Zugriff auf diese Version" });
      }
      return version;
    }),
    // Version wiederherstellen
    restore: protectedProcedure.input(z2.object({ versionId: z2.number() })).mutation(async ({ ctx, input }) => {
      const version = await getPlanVersion(input.versionId);
      if (!version) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Version nicht gefunden" });
      }
      const entry = await getSisEntry(version.sisEntryId, ctx.user.id);
      if (!entry) {
        throw new TRPCError3({ code: "FORBIDDEN", message: "Kein Zugriff" });
      }
      await updateSisEntry(version.sisEntryId, ctx.user.id, { massnahmenplan: version.content });
      await savePlanVersion({
        sisEntryId: version.sisEntryId,
        content: version.content,
        createdBy: ctx.user.id
      });
      return { success: true };
    })
  })
});
function buildSisPrompt(entry) {
  const riskMatrix = entry.riskMatrix;
  let prompt = `# Strukturierte Informationssammlung (SIS)

## Stammdaten
- Name: ${entry.patientName}
- Geburtsdatum: ${entry.birthDate || "Nicht angegeben"}
- Gespr\xE4ch am: ${entry.conversationDate || "Nicht angegeben"}
- Pflegefachkraft: ${entry.nurseSignature || "Nicht angegeben"}
- Angeh\xF6riger/Betreuer: ${entry.relativeOrCaregiver || "Nicht angegeben"}

## Feld A - O-Ton (Perspektive der pflegebed\xFCrftigen Person)
${entry.oTon || "Keine Angaben"}

## Themenfeld 1 - Kognitive und kommunikative F\xE4higkeiten
${entry.themenfeld1 || "Keine Angaben"}

## Themenfeld 2 - Mobilit\xE4t und Beweglichkeit
${entry.themenfeld2 || "Keine Angaben"}

## Themenfeld 3 - Krankheitsbezogene Anforderungen und Belastungen
${entry.themenfeld3 || "Keine Angaben"}

## Themenfeld 4 - Selbstversorgung
${entry.themenfeld4 || "Keine Angaben"}

## Themenfeld 5 - Leben in sozialen Beziehungen
${entry.themenfeld5 || "Keine Angaben"}

## Themenfeld 6 - Wohnen/H\xE4uslichkeit
${entry.themenfeld6 || "Keine Angaben"}

## Risikomatrix
`;
  if (riskMatrix) {
    const risks = ["dekubitus", "sturz", "inkontinenz", "schmerz", "ernaehrung", "sonstiges"];
    const riskLabels = {
      dekubitus: "Dekubitus",
      sturz: "Sturz",
      inkontinenz: "Inkontinenz",
      schmerz: "Schmerz",
      ernaehrung: "Ern\xE4hrung",
      sonstiges: "Sonstiges"
    };
    const tfLabels = ["Kognition/Kommunikation", "Mobilit\xE4t", "Krankheitsbezogen", "Selbstversorgung", "Soziale Beziehungen"];
    for (const risk of risks) {
      const riskData = riskMatrix[risk];
      if (riskData) {
        let hasRisk = false;
        let riskDetails = [];
        for (let i = 1; i <= 5; i++) {
          const tf = riskData[`tf${i}`];
          if (tf?.ja) {
            hasRisk = true;
            riskDetails.push(`${tfLabels[i - 1]}${tf.weitere ? " (weitere Einsch\xE4tzung notwendig)" : ""}`);
          }
        }
        if (hasRisk) {
          prompt += `- **${riskLabels[risk]}**: Risiko identifiziert in: ${riskDetails.join(", ")}
`;
        }
      }
    }
  }
  return prompt;
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var AuthService = class {
  parseCookies(cookieHeader) {
    if (!cookieHeader) return /* @__PURE__ */ new Map();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }
  async createSessionToken(openId, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({ openId, name: options.name || "" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) return null;
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, name } = payload;
      if (!isNonEmptyString2(openId)) {
        return null;
      }
      return { openId, name: typeof name === "string" ? name : "" };
    } catch {
      return null;
    }
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const user = await getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    return user;
  }
};
var sdk = new AuthService();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/api-handler.ts
async function handler(req, res) {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const trpcPath = url.searchParams.get("path") || url.pathname.replace(/^\/api\/trpc\/?/, "");
  return nodeHTTPRequestHandler({
    router: appRouter,
    path: trpcPath,
    req,
    res,
    createContext: ({ req: req2, res: res2 }) => createContext({ req: req2, res: res2 })
  });
}
export {
  handler as default
};
