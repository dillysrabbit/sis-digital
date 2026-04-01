import { SignJWT } from "jose";

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Google token exchange failed:", err);
      return res.redirect(302, "/login?error=google_token_failed");
    }

    const tokenData = await tokenRes.json();

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return res.redirect(302, "/login?error=google_userinfo_failed");
    }

    const userInfo = await userRes.json();
    const openId = `google_${userInfo.id}`;

    // Create JWT session
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const token = await new SignJWT({ openId, name: userInfo.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000))
      .sign(secret);

    // Try to upsert user in DB (non-blocking)
    try {
      const { upsertUser } = await import("../../../server/db.js");
      await upsertUser({
        openId,
        name: userInfo.name || null,
        email: userInfo.email || null,
        loginMethod: "google",
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
    console.error("Google callback error:", error);
    res.redirect(302, "/login?error=google_failed");
  }
}
