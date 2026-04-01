import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Auth routes (Google, GitHub OAuth)
registerOAuthRoutes(app);

// PDF Export endpoint
app.get("/api/pdf/export/:id", async (req, res) => {
  try {
    const { getSisEntry } = await import("../server/db");
    const { generateSisPdfHtml } = await import("../server/pdfGenerator");
    const { sdk } = await import("../server/_core/sdk");

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
