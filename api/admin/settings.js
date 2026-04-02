import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";

// Available models (keep in sync with server/routers.ts)
const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Schnell und leistungsstark" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", description: "Höchste Qualität und Reasoning" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Schnell und kostengünstig" },
];

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

const PROMPT_TEMPLATES = [
  {
    id: "standard",
    name: "Standard (Ausführlich)",
    description: "Detaillierter Maßnahmenplan mit allen Themenfeldern",
    prompt: DEFAULT_SYSTEM_PROMPT,
  },
  {
    id: "kompakt",
    name: "Kompakt",
    description: "Kürzerer, übersichtlicher Maßnahmenplan",
    prompt: `Du bist ein erfahrener Pflegeexperte. Erstelle einen kompakten, übersichtlichen Maßnahmenplan basierend auf der SIS.

Der Plan soll:
- Maximal 1-2 Seiten umfassen
- Die wichtigsten Maßnahmen pro Themenfeld in Stichpunkten auflisten
- Prioritäten klar kennzeichnen (hoch/mittel/niedrig)
- Sofort umsetzbar und praxisnah sein

Verzichte auf ausführliche Erklärungen und fokussiere dich auf konkrete Handlungsanweisungen.`,
  },
  {
    id: "risikofokussiert",
    name: "Risikofokussiert",
    description: "Schwerpunkt auf identifizierte Risiken und Prävention",
    prompt: `Du bist ein erfahrener Pflegeexperte mit Spezialisierung auf Risikoprävention. Erstelle einen Maßnahmenplan mit besonderem Fokus auf die identifizierten Risiken.

Der Plan soll:
- Jeden identifizierten Risikobereich (Dekubitus, Sturz, Inkontinenz, Schmerz, Ernährung) einzeln adressieren
- Konkrete präventive Maßnahmen für jedes Risiko benennen
- Frühwarnzeichen und Eskalationskriterien definieren
- Regelmäßige Überprüfungsintervalle vorschlagen
- Die Ressourcen der pflegebedürftigen Person in die Prävention einbeziehen

Strukturiere den Plan nach Risikobereichen, nicht nach Themenfeldern.`,
  },
  {
    id: "ressourcenorientiert",
    name: "Ressourcenorientiert",
    description: "Fokus auf Fähigkeiten und Selbstständigkeit",
    prompt: `Du bist ein erfahrener Pflegeexperte mit ressourcenorientiertem Ansatz. Erstelle einen Maßnahmenplan, der die vorhandenen Fähigkeiten und Ressourcen der pflegebedürftigen Person in den Mittelpunkt stellt.

Der Plan soll:
- Vorhandene Fähigkeiten und Stärken hervorheben
- Maßnahmen zur Förderung der Selbstständigkeit priorisieren
- Aktivierende Pflege in den Vordergrund stellen
- Die Wünsche und Ziele der Person (O-Ton) berücksichtigen
- Unterstützung nur dort vorsehen, wo sie wirklich nötig ist

Formuliere positiv und stärkenorientiert.`,
  },
  {
    id: "angehoerige",
    name: "Für Angehörige",
    description: "Verständlich formuliert für Angehörige und Betreuer",
    prompt: `Du bist ein erfahrener Pflegeexperte. Erstelle einen Maßnahmenplan, der auch für Angehörige und pflegende Laien verständlich ist.

Der Plan soll:
- Fachbegriffe vermeiden oder erklären
- Praktische Tipps für den Alltag geben
- Klare, einfache Handlungsanweisungen enthalten
- Auf typische Fragen von Angehörigen eingehen
- Entlastungsmöglichkeiten für pflegende Angehörige aufzeigen
- Warnzeichen benennen, bei denen professionelle Hilfe geholt werden sollte

Schreibe in einer warmen, unterstützenden Sprache.`,
  },
];

const CHECK_PROMPT_TEMPLATES = [
  {
    id: "standard",
    name: "Standard-Prüfung",
    description: "Umfassende Prüfung aller Aspekte der SIS",
    prompt: DEFAULT_CHECK_PROMPT,
  },
  {
    id: "schnellcheck",
    name: "Schnellcheck",
    description: "Kurze Prüfung auf die wichtigsten Punkte",
    prompt: `Du bist ein erfahrener Pflegeexperte. Führe einen schnellen Qualitätscheck der SIS durch.

Prüfe kurz und prägnant:
- Sind alle Pflichtfelder ausgefüllt?
- Gibt es offensichtliche Widersprüche?
- Sind die Risiken plausibel eingeschätzt?

Gib eine kurze Zusammenfassung (max. 5 Punkte) mit den wichtigsten Hinweisen.`,
  },
  {
    id: "mdkpruefung",
    name: "MDK-Prüfungsvorbereitung",
    description: "Prüfung nach MDK-Qualitätskriterien",
    prompt: `Du bist ein erfahrener Pflegeexperte mit Expertise in MDK-Qualitätsprüfungen. Prüfe die SIS nach den Kriterien, die bei einer MDK-Prüfung relevant sind.

Achte besonders auf:
- Nachvollziehbarkeit der pflegefachlichen Einschätzungen
- Dokumentation der individuellen Situation
- Berücksichtigung aller relevanten Risikobereiche
- Einbeziehung der Perspektive der pflegebedürftigen Person
- Konsistenz zwischen Einschätzung und Risikomatrix

Gib Hinweise, welche Aspekte bei einer MDK-Prüfung kritisch hinterfragt werden könnten.`,
  },
  {
    id: "risikofokus",
    name: "Risiko-Fokus",
    description: "Schwerpunkt auf Risikoeinschätzung",
    prompt: `Du bist ein erfahrener Pflegeexperte mit Spezialisierung auf Risikoprävention. Prüfe die SIS mit besonderem Fokus auf die Risikoeinschätzung.

Prüfe:
- Sind alle relevanten Risiken identifiziert?
- Passen die Risikoeinstufungen zu den dokumentierten Einschätzungen?
- Wurden Risiken möglicherweise übersehen oder unterschätzt?
- Ist der Bedarf an weiterer Einschätzung korrekt markiert?

Gib konkrete Empfehlungen zur Verbesserung der Risikoeinschätzung.`,
  },
  {
    id: "dokumentation",
    name: "Dokumentationsqualität",
    description: "Prüfung der Dokumentationsqualität",
    prompt: `Du bist ein erfahrener Pflegeexperte und Dokumentationsberater. Prüfe die SIS auf die Qualität der Dokumentation.

Achte auf:
- Verständlichkeit und Klarheit der Formulierungen
- Vermeidung von Floskeln und Standardtexten
- Individuelle, personenbezogene Beschreibungen
- Nachvollziehbarkeit für Dritte (z.B. Vertretungskräfte)
- Rechtliche Absicherung der Dokumentation

Gib Tipps zur Verbesserung der Dokumentationsqualität.`,
  },
];

function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

async function getSetting(sql, key) {
  try {
    const rows = await sql`SELECT "settingValue" FROM global_settings WHERE "settingKey" = ${key}`;
    return rows.length > 0 ? rows[0].settingValue : null;
  } catch (err) {
    console.error("getSetting failed:", key, err.message);
    return null;
  }
}

async function setSetting(sql, key, value) {
  const existing = await sql`SELECT id FROM global_settings WHERE "settingKey" = ${key}`;
  if (existing.length > 0) {
    await sql`UPDATE global_settings SET "settingValue" = ${value}, "updatedAt" = NOW() WHERE "settingKey" = ${key}`;
  } else {
    await sql`INSERT INTO global_settings ("settingKey", "settingValue", "createdAt", "updatedAt") VALUES (${key}, ${value}, NOW(), NOW())`;
  }
}

async function authenticateAdmin(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/app_session_id=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (!payload.openId) return null;
  return payload;
}

export default async function handler(req, res) {
  try {
    const user = await authenticateAdmin(req);
    if (!user) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }

    const body = req.method === "POST"
      ? (typeof req.body === "string" ? JSON.parse(req.body) : req.body)
      : {};
    const action = req.query.action || body.action;

    // Static data that doesn't need DB
    if (action === "getModels") {
      return res.json(AVAILABLE_MODELS);
    }
    if (action === "getPromptTemplates") {
      return res.json(PROMPT_TEMPLATES);
    }
    if (action === "getCheckPromptTemplates") {
      return res.json(CHECK_PROMPT_TEMPLATES);
    }

    // Template application (no DB needed for lookup, but save requires DB)
    if (action === "applyTemplate" && req.method === "POST") {
      const template = PROMPT_TEMPLATES.find(t => t.id === body.templateId);
      if (!template) return res.status(400).json({ error: "Vorlage nicht gefunden" });
      const sql = getDb();
      if (sql) {
        await setSetting(sql, "system_prompt", template.prompt);
      }
      return res.json({ success: true, prompt: template.prompt });
    }
    if (action === "applyCheckTemplate" && req.method === "POST") {
      const template = CHECK_PROMPT_TEMPLATES.find(t => t.id === body.templateId);
      if (!template) return res.status(400).json({ error: "Vorlage nicht gefunden" });
      const sql = getDb();
      if (sql) {
        await setSetting(sql, "check_system_prompt", template.prompt);
      }
      return res.json({ success: true, prompt: template.prompt });
    }

    // DB-dependent operations
    const sql = getDb();
    if (!sql) {
      console.error("DB connection returned null. DATABASE_URL set:", !!process.env.DATABASE_URL);
      return res.status(500).json({ error: "Keine Datenbankverbindung. Bitte DATABASE_URL prüfen." });
    }

      switch (action) {
        // ── Maßnahmenplan ──
        case "getSystemPrompt": {
          const val = await getSetting(sql, "system_prompt");
          return res.json({ prompt: val || DEFAULT_SYSTEM_PROMPT });
        }
        case "setSystemPrompt": {
          await setSetting(sql, "system_prompt", body.prompt);
          return res.json({ success: true });
        }
        case "resetSystemPrompt": {
          await setSetting(sql, "system_prompt", DEFAULT_SYSTEM_PROMPT);
          return res.json({ success: true, prompt: DEFAULT_SYSTEM_PROMPT });
        }
        case "getSelectedModel": {
          const val = await getSetting(sql, "anthropic_model");
          return res.json({ model: val || DEFAULT_MODEL });
        }
        case "setModel": {
          const valid = AVAILABLE_MODELS.map(m => m.id);
          if (!valid.includes(body.model)) {
            return res.status(400).json({ error: "Ungültiges Modell" });
          }
          await setSetting(sql, "anthropic_model", body.model);
          return res.json({ success: true });
        }

        // ── SIS-Prüfung ──
        case "getCheckSystemPrompt": {
          const val = await getSetting(sql, "check_system_prompt");
          return res.json({ prompt: val || DEFAULT_CHECK_PROMPT });
        }
        case "setCheckSystemPrompt": {
          await setSetting(sql, "check_system_prompt", body.prompt);
          return res.json({ success: true });
        }
        case "resetCheckSystemPrompt": {
          await setSetting(sql, "check_system_prompt", DEFAULT_CHECK_PROMPT);
          return res.json({ success: true, prompt: DEFAULT_CHECK_PROMPT });
        }
        case "getCheckSelectedModel": {
          const val = await getSetting(sql, "check_anthropic_model");
          return res.json({ model: val || DEFAULT_MODEL });
        }
        case "setCheckModel": {
          const valid = AVAILABLE_MODELS.map(m => m.id);
          if (!valid.includes(body.model)) {
            return res.status(400).json({ error: "Ungültiges Modell" });
          }
          await setSetting(sql, "check_anthropic_model", body.model);
          return res.json({ success: true });
        }

        default:
          return res.status(400).json({ error: "Unbekannte Aktion" });
      }
  } catch (err) {
    console.error("Admin settings error:", err.message, err.stack);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
