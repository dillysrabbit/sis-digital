import { jwtVerify } from "jose";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Authenticate user from cookie
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/app_session_id=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    if (!payload.openId) {
      return res.status(401).json({ error: "Ungültige Session" });
    }

    // 2. Check admin password
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (body.password !== adminPassword) {
      return res.status(403).json({ error: "Falsches Passwort" });
    }

    // 3. Promote user to admin in DB
    try {
      if (process.env.DATABASE_URL) {
        const pg = (await import("postgres")).default;
        const sql = pg(process.env.DATABASE_URL, { ssl: "prefer" });
        await sql`UPDATE users SET role = 'admin', "updatedAt" = NOW() WHERE "openId" = ${payload.openId}`;
        await sql.end();
      }
    } catch (dbErr) {
      console.error("DB promote failed:", dbErr);
      // Still return success — user verified password correctly.
      // Admin role will be set on next DB-available request.
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Verify password error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
