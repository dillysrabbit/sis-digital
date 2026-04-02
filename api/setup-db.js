// One-time setup endpoint to create missing tables in Supabase
// Call: GET /api/setup-db
// Remove this file after tables are created

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY" });
  }

  const sql = `
    -- Create sis_entries table
    CREATE TABLE IF NOT EXISTS "sis_entries" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "patientName" VARCHAR(255) NOT NULL,
      "birthDate" VARCHAR(20),
      "conversationDate" VARCHAR(20),
      "nurseSignature" VARCHAR(255),
      "relativeOrCaregiver" VARCHAR(255),
      "diagnosen" JSON,
      "oTon" TEXT,
      "themenfeld1" TEXT,
      "themenfeld2" TEXT,
      "themenfeld3" TEXT,
      "themenfeld4" TEXT,
      "themenfeld5" TEXT,
      "themenfeld6" TEXT,
      "riskMatrix" JSON,
      "massnahmenplan" TEXT,
      "pruefungsergebnis" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
      "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Create plan_versions table
    CREATE TABLE IF NOT EXISTS "plan_versions" (
      "id" SERIAL PRIMARY KEY,
      "sisEntryId" INTEGER NOT NULL,
      "content" TEXT NOT NULL,
      "versionNumber" INTEGER NOT NULL,
      "createdBy" INTEGER NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- Disable RLS on these tables so service key can access them
    ALTER TABLE "sis_entries" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "service_all" ON "sis_entries" FOR ALL USING (true) WITH CHECK (true);

    ALTER TABLE "plan_versions" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "service_all" ON "plan_versions" FOR ALL USING (true) WITH CHECK (true);

    -- Also fix RLS on users table
    CREATE POLICY IF NOT EXISTS "service_all" ON "users" FOR ALL USING (true) WITH CHECK (true);
  `;

  // Try Supabase SQL endpoint (available with service_role key)
  // Method 1: /pg/query (Supabase v2)
  let result = null;
  let method = null;

  // Try the Supabase SQL API
  const sqlRes = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (sqlRes.ok) {
    result = await sqlRes.json();
    method = "rpc/exec_sql";
  } else {
    const errText = await sqlRes.text();

    // Try alternative: Supabase pg endpoint
    const pgRes = await fetch(`${url}/pg`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (pgRes.ok) {
      result = await pgRes.json();
      method = "pg";
    } else {
      const pgErr = await pgRes.text();
      return res.json({
        error: "Could not execute SQL",
        rpcError: errText,
        pgError: pgErr,
        hint: "Please run the SQL manually in the Supabase SQL Editor",
        sql: sql,
      });
    }
  }

  return res.json({ success: true, method, result });
}
