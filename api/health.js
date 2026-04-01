export default function handler(req, res) {
  res.json({
    ok: true,
    google: !!process.env.GOOGLE_CLIENT_ID,
    github: !!process.env.GITHUB_CLIENT_ID,
    jwt: !!process.env.JWT_SECRET,
    db: !!process.env.DATABASE_URL,
  });
}
