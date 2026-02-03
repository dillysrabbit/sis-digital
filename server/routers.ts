import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createSisEntry, updateSisEntry, getSisEntry, listSisEntries, deleteSisEntry, getSetting, setSetting, getGlobalSetting, setGlobalSetting } from "./db";
import { TRPCError } from "@trpc/server";
import { generateSisPdfHtml } from "./pdfGenerator";

// Verfügbare OpenAI Modelle
const AVAILABLE_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", description: "Neuestes und leistungsstärkstes Modell" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Schneller und kosteneffizienter" },
  { id: "gpt-4", name: "GPT-4", description: "Klassisches GPT-4 Modell" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Schnell und kostengünstig" },
] as const;

const DEFAULT_MODEL = "gpt-4o";

// Default System Prompt für die Maßnahmenplan-Generierung
const DEFAULT_SYSTEM_PROMPT = `Du bist ein erfahrener Pflegeexperte und erstellst individuelle Maßnahmenpläne basierend auf der Strukturierten Informationssammlung (SIS). 
                
Erstelle einen detaillierten, praxisnahen Maßnahmenplan, der:
- Auf die individuellen Bedürfnisse und Ressourcen der pflegebedürftigen Person eingeht
- Konkrete, umsetzbare Maßnahmen für jedes relevante Themenfeld enthält
- Die identifizierten Risiken berücksichtigt
- Die Wünsche und Perspektive der pflegebedürftigen Person (O-Ton) einbezieht
- Professionell und verständlich formuliert ist

Strukturiere den Maßnahmenplan nach Themenfeldern und priorisiere nach Dringlichkeit.`;

// Default System Prompt für die SIS-Prüfung
const DEFAULT_CHECK_PROMPT = `Du bist ein erfahrener Pflegeexperte und Qualitätsbeauftragter. Deine Aufgabe ist es, die Strukturierte Informationssammlung (SIS) auf Vollständigkeit, Plausibilität und fachliche Qualität zu prüfen.

Prüfe die SIS auf folgende Aspekte:

1. **Vollständigkeit**: Sind alle relevanten Themenfelder ausgefüllt? Fehlen wichtige Informationen?

2. **Plausibilität**: Passen die Angaben zueinander? Gibt es Widersprüche zwischen den Themenfeldern?

3. **Risikomatrix**: Sind die identifizierten Risiken nachvollziehbar? Wurden Risiken möglicherweise übersehen?

4. **O-Ton**: Ist die Perspektive der pflegebedürftigen Person ausreichend dokumentiert?

5. **Fachliche Qualität**: Sind die Einschätzungen fachlich korrekt und nachvollziehbar formuliert?

Gib konstruktives Feedback mit konkreten Verbesserungsvorschlägen. Strukturiere deine Rückmeldung nach den Prüfaspekten.`;

// Vordefinierte Prompt-Vorlagen für Maßnahmenplan
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
] as const;

// Vordefinierte Prompt-Vorlagen für SIS-Prüfung
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
] as const;

// Risikomatrix Schema
const riskMatrixSchema = z.object({
  dekubitus: z.object({
    tf1: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf2: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf3: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf4: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf5: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
  }).optional(),
  sturz: z.object({
    tf1: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf2: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf3: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf4: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf5: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
  }).optional(),
  inkontinenz: z.object({
    tf1: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf2: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf3: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf4: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf5: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
  }).optional(),
  schmerz: z.object({
    tf1: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf2: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf3: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf4: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf5: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
  }).optional(),
  ernaehrung: z.object({
    tf1: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf2: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf3: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf4: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf5: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
  }).optional(),
  sonstiges: z.object({
    tf1: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf2: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf3: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf4: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
    tf5: z.object({ ja: z.boolean(), weitere: z.boolean() }).optional(),
  }).optional(),
}).optional();

// SIS Entry Schema
const sisEntryInputSchema = z.object({
  patientName: z.string().min(1, "Name ist erforderlich"),
  birthDate: z.string().optional(),
  conversationDate: z.string().optional(),
  nurseSignature: z.string().optional(),
  relativeOrCaregiver: z.string().optional(),
  oTon: z.string().optional(),
  themenfeld1: z.string().optional(),
  themenfeld2: z.string().optional(),
  themenfeld3: z.string().optional(),
  themenfeld4: z.string().optional(),
  themenfeld5: z.string().optional(),
  themenfeld6: z.string().optional(),
  riskMatrix: riskMatrixSchema,
  massnahmenplan: z.string().optional(),
  pruefungsergebnis: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  sis: router({
    // Create new SIS entry
    create: protectedProcedure
      .input(sisEntryInputSchema)
      .mutation(async ({ ctx, input }) => {
        const id = await createSisEntry({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    // Update existing SIS entry
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: sisEntryInputSchema.partial(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateSisEntry(input.id, ctx.user.id, input.data);
        return { success: true };
      }),

    // Get single SIS entry
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getSisEntry(input.id, ctx.user.id);
      }),

    // List all SIS entries for user
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await listSisEntries(ctx.user.id);
      }),

    // Delete SIS entry
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSisEntry(input.id, ctx.user.id);
        return { success: true };
      }),

    // Generate PDF HTML for export
    exportPdfHtml: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const entry = await getSisEntry(input.id, ctx.user.id);
        if (!entry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "SIS-Eintrag nicht gefunden" });
        }
        const html = generateSisPdfHtml(entry);
        return { html, patientName: entry.patientName };
      }),

    // Generate Maßnahmenplan using OpenAI
    generatePlan: protectedProcedure
      .input(z.object({
        id: z.number(),
        apiKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const entry = await getSisEntry(input.id, ctx.user.id);
        if (!entry) {
          throw new Error("SIS-Eintrag nicht gefunden");
        }

        // Get API key - prefer user-provided, then user-saved, then system env
        let apiKey = input.apiKey;
        if (!apiKey) {
          apiKey = await getSetting(ctx.user.id, "openai_api_key") || undefined;
        }
        if (!apiKey) {
          apiKey = process.env.OPENAI_API_KEY;
        }
        if (!apiKey) {
          throw new Error("Kein OpenAI API-Key verfügbar. Bitte hinterlegen Sie einen API-Key in den Einstellungen.");
        }

        // Build prompt from SIS data
        const prompt = buildSisPrompt(entry);
        
        // Get custom system prompt or use default
        const systemPrompt = await getGlobalSetting("system_prompt") || DEFAULT_SYSTEM_PROMPT;
        
        // Get selected model or use default
        const selectedModel = await getGlobalSetting("openai_model") || DEFAULT_MODEL;

        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "OpenAI API Fehler");
        }

        const data = await response.json();
        const plan = data.choices[0]?.message?.content || "";

        // Save the generated plan
        await updateSisEntry(input.id, ctx.user.id, { massnahmenplan: plan });

        return { plan };
      }),

    // Check SIS using OpenAI (separate function)
    checkSis: protectedProcedure
      .input(z.object({
        id: z.number(),
        apiKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const entry = await getSisEntry(input.id, ctx.user.id);
        if (!entry) {
          throw new Error("SIS-Eintrag nicht gefunden");
        }

        // Get API key - prefer user-provided, then user-saved, then system env
        let apiKey = input.apiKey;
        if (!apiKey) {
          apiKey = await getSetting(ctx.user.id, "openai_api_key") || undefined;
        }
        if (!apiKey) {
          apiKey = process.env.OPENAI_API_KEY;
        }
        if (!apiKey) {
          throw new Error("Kein OpenAI API-Key verfügbar. Bitte hinterlegen Sie einen API-Key in den Einstellungen.");
        }

        // Build prompt from SIS data
        const prompt = buildSisPrompt(entry);
        
        // Get custom system prompt for checking or use default
        const systemPrompt = await getGlobalSetting("check_system_prompt") || DEFAULT_CHECK_PROMPT;
        
        // Get selected model for checking or use default
        const selectedModel = await getGlobalSetting("check_openai_model") || DEFAULT_MODEL;

        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "OpenAI API Fehler");
        }

        const data = await response.json();
        const result = data.choices[0]?.message?.content || "";

        // Save the check result
        await updateSisEntry(input.id, ctx.user.id, { pruefungsergebnis: result });

        return { result };
      }),
  }),

  settings: router({
    // Get API key (masked)
    getApiKey: protectedProcedure
      .query(async ({ ctx }) => {
        const key = await getSetting(ctx.user.id, "openai_api_key");
        if (!key) return null;
        // Return masked key
        return key.substring(0, 7) + "..." + key.substring(key.length - 4);
      }),

    // Save API key
    setApiKey: protectedProcedure
      .input(z.object({ apiKey: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await setSetting(ctx.user.id, "openai_api_key", input.apiKey);
        return { success: true };
      }),

    // Get full API key (for internal use)
    getFullApiKey: protectedProcedure
      .query(async ({ ctx }) => {
        return await getSetting(ctx.user.id, "openai_api_key");
      }),
  }),

  // Admin-only routes
  admin: router({
    // Check if user is admin
    isAdmin: protectedProcedure
      .query(({ ctx }) => {
        return ctx.user.role === "admin";
      }),

    // ============ MAASSNAHMENPLAN SETTINGS ============
    
    // Get system prompt for Maßnahmenplan
    getSystemPrompt: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const prompt = await getGlobalSetting("system_prompt");
        return prompt || DEFAULT_SYSTEM_PROMPT;
      }),

    // Save system prompt for Maßnahmenplan
    setSystemPrompt: protectedProcedure
      .input(z.object({ prompt: z.string().min(1, "Prompt darf nicht leer sein") }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        await setGlobalSetting("system_prompt", input.prompt);
        return { success: true };
      }),

    // Reset to default prompt for Maßnahmenplan
    resetSystemPrompt: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        await setGlobalSetting("system_prompt", DEFAULT_SYSTEM_PROMPT);
        return { success: true, prompt: DEFAULT_SYSTEM_PROMPT };
      }),

    // Get available models
    getModels: protectedProcedure
      .query(({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        return AVAILABLE_MODELS;
      }),

    // Get selected model for Maßnahmenplan
    getSelectedModel: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const model = await getGlobalSetting("openai_model");
        return model || DEFAULT_MODEL;
      }),

    // Set selected model for Maßnahmenplan
    setModel: protectedProcedure
      .input(z.object({ model: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const validModels = AVAILABLE_MODELS.map(m => m.id);
        if (!validModels.includes(input.model as any)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültiges Modell" });
        }
        await setGlobalSetting("openai_model", input.model);
        return { success: true };
      }),

    // Get prompt templates for Maßnahmenplan
    getPromptTemplates: protectedProcedure
      .query(({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        return PROMPT_TEMPLATES;
      }),

    // Apply a prompt template for Maßnahmenplan
    applyTemplate: protectedProcedure
      .input(z.object({ templateId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const template = PROMPT_TEMPLATES.find(t => t.id === input.templateId);
        if (!template) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Vorlage nicht gefunden" });
        }
        await setGlobalSetting("system_prompt", template.prompt);
        return { success: true, prompt: template.prompt };
      }),

    // ============ SIS-PRÜFUNG SETTINGS ============

    // Get system prompt for SIS-Prüfung
    getCheckSystemPrompt: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const prompt = await getGlobalSetting("check_system_prompt");
        return prompt || DEFAULT_CHECK_PROMPT;
      }),

    // Save system prompt for SIS-Prüfung
    setCheckSystemPrompt: protectedProcedure
      .input(z.object({ prompt: z.string().min(1, "Prompt darf nicht leer sein") }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        await setGlobalSetting("check_system_prompt", input.prompt);
        return { success: true };
      }),

    // Reset to default prompt for SIS-Prüfung
    resetCheckSystemPrompt: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        await setGlobalSetting("check_system_prompt", DEFAULT_CHECK_PROMPT);
        return { success: true, prompt: DEFAULT_CHECK_PROMPT };
      }),

    // Get selected model for SIS-Prüfung
    getCheckSelectedModel: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const model = await getGlobalSetting("check_openai_model");
        return model || DEFAULT_MODEL;
      }),

    // Set selected model for SIS-Prüfung
    setCheckModel: protectedProcedure
      .input(z.object({ model: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const validModels = AVAILABLE_MODELS.map(m => m.id);
        if (!validModels.includes(input.model as any)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültiges Modell" });
        }
        await setGlobalSetting("check_openai_model", input.model);
        return { success: true };
      }),

    // Get prompt templates for SIS-Prüfung
    getCheckPromptTemplates: protectedProcedure
      .query(({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        return CHECK_PROMPT_TEMPLATES;
      }),

    // Apply a prompt template for SIS-Prüfung
    applyCheckTemplate: protectedProcedure
      .input(z.object({ templateId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Nur Administratoren haben Zugriff" });
        }
        const template = CHECK_PROMPT_TEMPLATES.find(t => t.id === input.templateId);
        if (!template) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Vorlage nicht gefunden" });
        }
        await setGlobalSetting("check_system_prompt", template.prompt);
        return { success: true, prompt: template.prompt };
      }),
  }),
});

function buildSisPrompt(entry: any): string {
  const riskMatrix = entry.riskMatrix as any;
  
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
    const riskLabels: Record<string, string> = {
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

export type AppRouter = typeof appRouter;
