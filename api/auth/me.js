import { jwtVerify } from "jose";

export default async function handler(req, res) {
  try {
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/app_session_id=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return res.json({ user: null });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    if (!payload.openId) {
      return res.json({ user: null });
    }

    // Try to get user from DB
    let user = { openId: payload.openId, name: payload.name || "", role: "user" };
    try {
      if (process.env.DATABASE_URL) {
        const pg = (await import("postgres")).default;
        const sql = pg(process.env.DATABASE_URL);
        const rows = await sql`SELECT id, "openId", name, email, role FROM users WHERE "openId" = ${payload.openId} LIMIT 1`;
        if (rows.length > 0) {
          user = rows[0];
        }
        await sql.end();
      }
    } catch (dbErr) {
      console.error("DB lookup failed (continuing with JWT data):", dbErr);
    }

    return res.json({ user });
  } catch (err) {
    console.error("Auth me error:", err);
    return res.json({ user: null });
  }
}
