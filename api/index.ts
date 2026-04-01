import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { sdk } from "../server/_core/sdk";
import { getSessionCookieOptions } from "../server/_core/cookies";
import { COOKIE_NAME } from "../shared/const";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// REST auth endpoints
app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

// PDF Export endpoint
app.get("/api/pdf/export/:id", async (req, res) => {
  try {
    const { getSisEntry } = await import("../server/db");
    const { generateSisPdfHtml } = await import("../server/pdfGenerator");

    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const entry = await getSisEntry(id, user.id);
    if (!entry) {
      return res.status(404).json({ error: "SIS-Eintrag nicht gefunden" });
    }

    const html = generateSisPdfHtml(entry);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(html);
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
