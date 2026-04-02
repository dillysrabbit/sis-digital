import { jwtVerify } from "jose";

const DEFAULT_MODEL = "claude-sonnet-4-6";

const DEFAULT_SYSTEM_PROMPT = `Du bist ein erfahrener Pflegeexperte und erstellst individuelle Maßnahmenpläne basierend auf der Strukturierten Informationssammlung (SIS).

Erstelle einen detaillierten, praxisnahen Maßnahmenplan, der:
- Auf die individuellen Bedürfnisse und Ressourcen der pflegebedürftigen Person eingeht
- Konkrete, umsetzbare Maßnahmen für jedes relevante Themenfeld enthält
- Die identifizierten Risiken berücksichtigt
- Die Wünsche und Perspektive der pflegebedürftigen Person (O-Ton) einbezieht
- Professionell und verständlich formuliert ist

Strukturiere den Maßnahmenplan nach Themenfeldern und priorisiere nach Dringlichkeit.`;

const DEFAULT_CHECK_PROMPT = `Du bist ein erfahrener Pflegeexperte und Qualitätsbeauftragter. Deine Aufgabe ist es, die Strukturierte Informationssammlung (SIS) auf Vollständigkeit, Plausibilität und fachliche Qualität zu prüfen.

Prüfe die SIS auf folgende Aspekte:

1. **Vollständigkeit**: Sind alle relevanten Themenfelder ausgefüllt? Fehlen wichtige Informationen?

2. **Plausibilität**: Passen die Angaben zueinander? Gibt es Widersprüche zwischen den Themenfeldern?

3. **Risikomatrix**: Sind die identifizierten Risiken nachvollziehbar? Wurden Risiken möglicherweise übersehen?

4. **O-Ton**: Ist die Perspektive der pflegebedürftigen Person ausreichend dokumentiert?

5. **Fachliche Qualität**: Sind die Einschätzungen fachlich korrekt und nachvollziehbar formuliert?

Gib konstruktives Feedback mit konkreten Verbesserungsvorschlägen. Strukturiere deine Rückmeldung nach den Prüfaspekten.`;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseQuery(sb, path, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options;
  const res = await fetch(`${sb.url}/rest/v1/${path}`, {
    ...restOptions,
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return null;
}

async function authenticateUser(req) {
  try {
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/app_session_id=([^;]+)/);
    const token = match ? match[1] : null;
    if (!token) {
      console.error("SIS Auth: no token");
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (!payload.openId) {
      console.error("SIS Auth: no openId in JWT");
      return null;
    }

    // Look up user ID via postgres driver (same approach as api/auth/me.js)
    if (!process.env.DATABASE_URL) {
      console.error("SIS Auth: no DATABASE_URL");
      return null;
    }
    const pg = (await import("postgres")).default;
    const sql = pg(process.env.DATABASE_URL);
    const rows = await sql`SELECT id, "openId", name, role FROM users WHERE "openId" = ${payload.openId} LIMIT 1`;
    await sql.end();

    if (!rows || rows.length === 0) {
      console.error("SIS Auth: user not found for openId:", payload.openId);
      return null;
    }

    return { openId: payload.openId, id: rows[0].id, role: rows[0].role };
  } catch (err) {
    console.error("SIS Auth error:", err.message);
    return null;
  }
}

async function getSetting(sb, key) {
  try {
    const rows = await supabaseQuery(sb, `global_settings?settingKey=eq.${encodeURIComponent(key)}&select=settingValue&limit=1`);
    return rows && rows.length > 0 ? rows[0].settingValue : null;
  } catch { return null; }
}

function buildSisPrompt(entry) {
  const riskMatrix = entry.riskMatrix;

  let prompt = `# Strukturierte Informationssammlung (SIS)

## Stammdaten
- Name: ${entry.patientName}
- Geburtsdatum: ${entry.birthDate || "Nicht angegeben"}
- Gespräch am: ${entry.conversationDate || "Nicht angegeben"}
- Pflegefachkraft: ${entry.nurseSignature || "Nicht angegeben"}
- Angehöriger/Betreuer: ${entry.relativeOrCaregiver || "Nicht angegeben"}

## Feld A - O-Ton (Perspektive der pflegebedürftigen Person)
${entry.oTon || "Keine Angaben"}

## Themenfeld 1 - Kognitive und kommunikative Fähigkeiten
${entry.themenfeld1 || "Keine Angaben"}

## Themenfeld 2 - Mobilität und Beweglichkeit
${entry.themenfeld2 || "Keine Angaben"}

## Themenfeld 3 - Krankheitsbezogene Anforderungen und Belastungen
${entry.themenfeld3 || "Keine Angaben"}

## Themenfeld 4 - Selbstversorgung
${entry.themenfeld4 || "Keine Angaben"}

## Themenfeld 5 - Leben in sozialen Beziehungen
${entry.themenfeld5 || "Keine Angaben"}

## Themenfeld 6 - Wohnen/Häuslichkeit
${entry.themenfeld6 || "Keine Angaben"}

## Risikomatrix
`;

  if (riskMatrix) {
    const risks = ["dekubitus", "sturz", "inkontinenz", "schmerz", "ernaehrung", "sonstiges"];
    const riskLabels = {
      dekubitus: "Dekubitus",
      sturz: "Sturz",
      inkontinenz: "Inkontinenz",
      schmerz: "Schmerz",
      ernaehrung: "Ernährung",
      sonstiges: "Sonstiges"
    };
    const tfLabels = ["Kognition/Kommunikation", "Mobilität", "Krankheitsbezogen", "Selbstversorgung", "Soziale Beziehungen"];

    for (const risk of risks) {
      const riskData = riskMatrix[risk];
      if (riskData) {
        let hasRisk = false;
        let riskDetails = [];
        for (let i = 1; i <= 5; i++) {
          const tf = riskData[`tf${i}`];
          if (tf?.ja) {
            hasRisk = true;
            riskDetails.push(`${tfLabels[i-1]}${tf.weitere ? " (weitere Einschätzung notwendig)" : ""}`);
          }
        }
        if (hasRisk) {
          prompt += `- **${riskLabels[risk]}**: Risiko identifiziert in: ${riskDetails.join(", ")}\n`;
        }
      }
    }
  }

  return prompt;
}

export default async function handler(req, res) {
  try {
    const sb = getSupabase();
    if (!sb) {
      return res.status(500).json({ error: "Keine Datenbankverbindung" });
    }

    const user = await authenticateUser(req);
    if (!user) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const body = req.method === "POST"
      ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body)
      : {};
    const action = req.query.action || body.action;

    switch (action) {
      // ── SIS CRUD ──
      case "list": {
        const rows = await supabaseQuery(sb, `sis_entries?userId=eq.${user.id}&order=updatedAt.desc`);
        return res.json(rows);
      }

      case "get": {
        const id = req.query.id || body.id;
        if (!id) return res.status(400).json({ error: "ID erforderlich" });
        const rows = await supabaseQuery(sb, `sis_entries?id=eq.${id}&userId=eq.${user.id}&limit=1`);
        if (!rows || rows.length === 0) return res.status(404).json({ error: "SIS-Eintrag nicht gefunden" });
        return res.json(rows[0]);
      }

      case "create": {
        const { action: _a, ...data } = body;
        if (!data.patientName) return res.status(400).json({ error: "Name ist erforderlich" });
        const now = new Date().toISOString();
        const rows = await supabaseQuery(sb, "sis_entries", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            ...data,
            userId: user.id,
            createdAt: now,
            updatedAt: now,
          }),
        });
        return res.json({ id: rows[0]?.id });
      }

      case "update": {
        const { action: _a2, id: updateId, data: updateData } = body;
        if (!updateId) return res.status(400).json({ error: "ID erforderlich" });
        await supabaseQuery(sb, `sis_entries?id=eq.${updateId}&userId=eq.${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...updateData,
            updatedAt: new Date().toISOString(),
          }),
        });
        return res.json({ success: true });
      }

      case "delete": {
        const deleteId = req.query.id || body.id;
        if (!deleteId) return res.status(400).json({ error: "ID erforderlich" });
        await supabaseQuery(sb, `sis_entries?id=eq.${deleteId}&userId=eq.${user.id}`, {
          method: "DELETE",
        });
        return res.json({ success: true });
      }

      // ── Plan generation ──
      case "generatePlan": {
        const { id: planId } = body;
        if (!planId) return res.status(400).json({ error: "ID erforderlich" });

        // Get the SIS entry
        const entries = await supabaseQuery(sb, `sis_entries?id=eq.${planId}&userId=eq.${user.id}&limit=1`);
        if (!entries || entries.length === 0) return res.status(404).json({ error: "SIS-Eintrag nicht gefunden" });
        const entry = entries[0];

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "Kein Anthropic API-Key konfiguriert" });

        const prompt = buildSisPrompt(entry);
        const systemPrompt = await getSetting(sb, "system_prompt") || DEFAULT_SYSTEM_PROMPT;
        const selectedModel = await getSetting(sb, "anthropic_model") || DEFAULT_MODEL;

        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: selectedModel,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });

        if (!aiResponse.ok) {
          const error = await aiResponse.json();
          throw new Error(error.error?.message || "Anthropic API Fehler");
        }

        const aiData = await aiResponse.json();
        const plan = aiData.content?.[0]?.text || "";

        // Save the plan to the entry
        await supabaseQuery(sb, `sis_entries?id=eq.${planId}&userId=eq.${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ massnahmenplan: plan, updatedAt: new Date().toISOString() }),
        });

        // Save version history
        const existingVersions = await supabaseQuery(sb, `plan_versions?sisEntryId=eq.${planId}&order=versionNumber.desc&limit=1`);
        const nextVersion = existingVersions && existingVersions.length > 0 ? existingVersions[0].versionNumber + 1 : 1;
        await supabaseQuery(sb, "plan_versions", {
          method: "POST",
          body: JSON.stringify({
            sisEntryId: planId,
            content: plan,
            versionNumber: nextVersion,
            createdBy: user.id,
            createdAt: new Date().toISOString(),
          }),
        });

        return res.json({ plan });
      }

      // ── SIS Check ──
      case "checkSis": {
        const { id: checkId } = body;
        if (!checkId) return res.status(400).json({ error: "ID erforderlich" });

        const entries = await supabaseQuery(sb, `sis_entries?id=eq.${checkId}&userId=eq.${user.id}&limit=1`);
        if (!entries || entries.length === 0) return res.status(404).json({ error: "SIS-Eintrag nicht gefunden" });
        const entry = entries[0];

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "Kein Anthropic API-Key konfiguriert" });

        const prompt = buildSisPrompt(entry);
        const systemPrompt = await getSetting(sb, "check_system_prompt") || DEFAULT_CHECK_PROMPT;
        const selectedModel = await getSetting(sb, "check_anthropic_model") || DEFAULT_MODEL;

        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: selectedModel,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });

        if (!aiResponse.ok) {
          const error = await aiResponse.json();
          throw new Error(error.error?.message || "Anthropic API Fehler");
        }

        const aiData = await aiResponse.json();
        const result = aiData.content?.[0]?.text || "";

        // Save the check result
        await supabaseQuery(sb, `sis_entries?id=eq.${checkId}&userId=eq.${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ pruefungsergebnis: result, updatedAt: new Date().toISOString() }),
        });

        return res.json({ result });
      }

      // ── Plan Versions ──
      case "listVersions": {
        const sisEntryId = req.query.sisEntryId || body.sisEntryId;
        if (!sisEntryId) return res.status(400).json({ error: "sisEntryId erforderlich" });
        // Verify access
        const entries = await supabaseQuery(sb, `sis_entries?id=eq.${sisEntryId}&userId=eq.${user.id}&limit=1`);
        if (!entries || entries.length === 0) return res.status(404).json({ error: "SIS-Eintrag nicht gefunden" });
        const versions = await supabaseQuery(sb, `plan_versions?sisEntryId=eq.${sisEntryId}&order=createdAt.desc`);
        return res.json(versions);
      }

      case "getVersion": {
        const versionId = req.query.versionId || body.versionId;
        if (!versionId) return res.status(400).json({ error: "versionId erforderlich" });
        const versionRows = await supabaseQuery(sb, `plan_versions?id=eq.${versionId}&limit=1`);
        if (!versionRows || versionRows.length === 0) return res.status(404).json({ error: "Version nicht gefunden" });
        const version = versionRows[0];
        // Verify access
        const entries = await supabaseQuery(sb, `sis_entries?id=eq.${version.sisEntryId}&userId=eq.${user.id}&limit=1`);
        if (!entries || entries.length === 0) return res.status(403).json({ error: "Kein Zugriff" });
        return res.json(version);
      }

      case "restoreVersion": {
        const { versionId: restoreVersionId } = body;
        if (!restoreVersionId) return res.status(400).json({ error: "versionId erforderlich" });
        const versionRows = await supabaseQuery(sb, `plan_versions?id=eq.${restoreVersionId}&limit=1`);
        if (!versionRows || versionRows.length === 0) return res.status(404).json({ error: "Version nicht gefunden" });
        const version = versionRows[0];
        // Verify access
        const entries = await supabaseQuery(sb, `sis_entries?id=eq.${version.sisEntryId}&userId=eq.${user.id}&limit=1`);
        if (!entries || entries.length === 0) return res.status(403).json({ error: "Kein Zugriff" });

        // Update the plan
        await supabaseQuery(sb, `sis_entries?id=eq.${version.sisEntryId}&userId=eq.${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ massnahmenplan: version.content, updatedAt: new Date().toISOString() }),
        });

        // Save restore as new version
        const existingVersions = await supabaseQuery(sb, `plan_versions?sisEntryId=eq.${version.sisEntryId}&order=versionNumber.desc&limit=1`);
        const nextVersion = existingVersions && existingVersions.length > 0 ? existingVersions[0].versionNumber + 1 : 1;
        await supabaseQuery(sb, "plan_versions", {
          method: "POST",
          body: JSON.stringify({
            sisEntryId: version.sisEntryId,
            content: version.content,
            versionNumber: nextVersion,
            createdBy: user.id,
            createdAt: new Date().toISOString(),
          }),
        });

        return res.json({ success: true });
      }

      default:
        return res.status(400).json({ error: "Unbekannte Aktion" });
    }
  } catch (err) {
    console.error("SIS API error:", err.message, err.stack);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
