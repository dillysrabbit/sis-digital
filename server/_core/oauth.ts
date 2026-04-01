import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

// ============ Google OAuth ============

function getGoogleAuthUrl(req: Request): string {
  const redirectUri = `${getOrigin(req)}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
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
  if (!res.ok) throw new Error("Google token exchange failed");
  return res.json() as Promise<{ access_token: string }>;
}

async function getGoogleUserInfo(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google user info");
  return res.json() as Promise<{ id: string; email: string; name: string }>;
}

// ============ GitHub OAuth ============

function getGitHubAuthUrl(req: Request): string {
  const redirectUri = `${getOrigin(req)}/api/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || "",
    redirect_uri: redirectUri,
    scope: "user:email",
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

async function exchangeGitHubCode(code: string, redirectUri: string) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      client_secret: process.env.GITHUB_CLIENT_SECRET || "",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error("GitHub token exchange failed");
  return res.json() as Promise<{ access_token: string }>;
}

async function getGitHubUserInfo(accessToken: string) {
  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "SIS-Digital" },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "SIS-Digital" },
    }),
  ]);
  if (!userRes.ok) throw new Error("Failed to fetch GitHub user info");

  const user = (await userRes.json()) as { id: number; login: string; name: string | null };
  let email: string | null = null;

  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as { email: string; primary: boolean }[];
    email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? null;
  }

  return { id: String(user.id), name: user.name || user.login, email };
}

// ============ Helpers ============

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

async function handleOAuthCallback(
  provider: string,
  providerId: string,
  name: string,
  email: string | null,
  req: Request,
  res: Response
) {
  const openId = `${provider}_${providerId}`;

  await db.upsertUser({
    openId,
    name,
    email,
    loginMethod: provider,
    lastSignedIn: new Date(),
  });

  const sessionToken = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  res.redirect(302, "/");
}

// ============ Routes ============

export function registerOAuthRoutes(app: Express) {
  // Google OAuth
  app.get("/api/auth/google", (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }
    res.redirect(302, getGoogleAuthUrl(req));
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
      const redirectUri = `${getOrigin(req)}/api/auth/google/callback`;
      const token = await exchangeGoogleCode(code, redirectUri);
      const userInfo = await getGoogleUserInfo(token.access_token);
      await handleOAuthCallback("google", userInfo.id, userInfo.name, userInfo.email, req, res);
    } catch (error) {
      console.error("[Auth] Google callback failed:", error);
      res.redirect(302, "/login?error=google_failed");
    }
  });

  // GitHub OAuth
  app.get("/api/auth/github", (req, res) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(500).json({ error: "GitHub OAuth not configured" });
    }
    res.redirect(302, getGitHubAuthUrl(req));
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
      const redirectUri = `${getOrigin(req)}/api/auth/github/callback`;
      const token = await exchangeGitHubCode(code, redirectUri);
      const userInfo = await getGitHubUserInfo(token.access_token);
      await handleOAuthCallback("github", userInfo.id, userInfo.name, userInfo.email, req, res);
    } catch (error) {
      console.error("[Auth] GitHub callback failed:", error);
      res.redirect(302, "/login?error=github_failed");
    }
  });

  // Auth status (which providers are configured)
  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: !!process.env.GOOGLE_CLIENT_ID,
      github: !!process.env.GITHUB_CLIENT_ID,
    });
  });
}
