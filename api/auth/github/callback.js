import { SignJWT } from "jose";

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/github/callback`;

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID || "",
        client_secret: process.env.GITHUB_CLIENT_SECRET || "",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return res.redirect(302, "/login?error=github_token_failed");
    }

    const tokenData = await tokenRes.json();

    // Get user info
    const [userRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "SIS-Digital" },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "SIS-Digital" },
      }),
    ]);

    if (!userRes.ok) {
      return res.redirect(302, "/login?error=github_userinfo_failed");
    }

    const user = await userRes.json();
    let email = null;
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      email = (emails.find((e) => e.primary) || emails[0])?.email || null;
    }

    const openId = `github_${user.id}`;
    const name = user.name || user.login;

    // Create JWT session
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const token = await new SignJWT({ openId, name })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000))
      .sign(secret);

    // Try to upsert user in DB (non-blocking)
    try {
      const { upsertUser } = await import("../../../server/db.js");
      await upsertUser({
        openId,
        name,
        email,
        loginMethod: "github",
        lastSignedIn: new Date(),
      });
    } catch (dbErr) {
      console.error("DB upsert failed (continuing):", dbErr);
    }

    // Set session cookie
    const isSecure = (proto === "https");
    res.setHeader("Set-Cookie", `app_session_id=${token}; Path=/; HttpOnly; SameSite=None; Max-Age=31536000${isSecure ? "; Secure" : ""}`);
    res.redirect(302, "/");
  } catch (error) {
    console.error("GitHub callback error:", error);
    res.redirect(302, "/login?error=github_failed");
  }
}
