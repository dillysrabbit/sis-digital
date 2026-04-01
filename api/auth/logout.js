export default function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const isSecure = proto === "https";
  res.setHeader("Set-Cookie", `app_session_id=; Path=/; HttpOnly; SameSite=None; Max-Age=0${isSecure ? "; Secure" : ""}`);
  res.json({ success: true });
}
