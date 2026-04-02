import { jwtVerify } from "jose";

const VALID_CATEGORIES = [
  "mobilitaet", "ernaehrung", "koerperpflege", "ausscheidung",
  "kommunikation", "soziales", "schmerz", "medikation",
  "wundversorgung", "allgemein",
];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

async function authenticateUser(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/app_session_id=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (!payload.openId) return null;
  return payload;
}

async function supabaseRequest(sb, path, options = {}) {
  const res = await fetch(`${sb.url}/rest/v1/${path}`, {
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error: ${text}`);
  }
  // DELETE and some operations return empty body
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}

export default async function handler(req, res) {
  try {
    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const sb = getSupabase();
    if (!sb) {
      return res.status(500).json({ error: "Keine Datenbankverbindung" });
    }

    const body = req.method === "POST" || req.method === "PUT" || req.method === "DELETE"
      ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body)
      : {};
    const action = req.query.action || body.action;

    switch (action) {
      case "list": {
        const rows = await supabaseRequest(sb, 'text_blocks?order=createdAt.desc');
        return res.json(rows);
      }

      case "byCategory": {
        const category = req.query.category || body.category;
        if (!category || !VALID_CATEGORIES.includes(category)) {
          return res.status(400).json({ error: "Ungültige Kategorie" });
        }
        const rows = await supabaseRequest(sb, `text_blocks?category=eq.${encodeURIComponent(category)}&order=createdAt.desc`);
        return res.json(rows);
      }

      case "create": {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Nur Administratoren können Textbausteine erstellen" });
        }
        const { title, content, category } = body;
        if (!title || !content || !category) {
          return res.status(400).json({ error: "Titel, Inhalt und Kategorie sind erforderlich" });
        }
        if (!VALID_CATEGORIES.includes(category)) {
          return res.status(400).json({ error: "Ungültige Kategorie" });
        }
        const rows = await supabaseRequest(sb, 'text_blocks', {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            title,
            content,
            category,
            isDefault: body.isDefault || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
        return res.json({ success: true, id: rows[0]?.id });
      }

      case "update": {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Nur Administratoren können Textbausteine bearbeiten" });
        }
        const { id, ...data } = body;
        if (!id) {
          return res.status(400).json({ error: "ID erforderlich" });
        }
        if (data.category && !VALID_CATEGORIES.includes(data.category)) {
          return res.status(400).json({ error: "Ungültige Kategorie" });
        }
        // Only include fields that were provided
        const updateData = { updatedAt: new Date().toISOString() };
        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.category !== undefined) updateData.category = data.category;

        await supabaseRequest(sb, `text_blocks?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify(updateData),
        });
        return res.json({ success: true });
      }

      case "delete": {
        if (user.role !== "admin") {
          return res.status(403).json({ error: "Nur Administratoren können Textbausteine löschen" });
        }
        const deleteId = req.query.id || body.id;
        if (!deleteId) {
          return res.status(400).json({ error: "ID erforderlich" });
        }
        await supabaseRequest(sb, `text_blocks?id=eq.${deleteId}`, {
          method: "DELETE",
        });
        return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: "Unbekannte Aktion" });
    }
  } catch (err) {
    console.error("Text blocks error:", err.message, err.stack);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
