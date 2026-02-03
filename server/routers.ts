import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createSisEntry, updateSisEntry, getSisEntry, listSisEntries, deleteSisEntry, getSetting, setSetting } from "./db";

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

    // Generate Maßnahmenplan using OpenAI
    generatePlan: protectedProcedure
      .input(z.object({
        id: z.number(),
        apiKey: z.string().min(1, "API Key ist erforderlich"),
      }))
      .mutation(async ({ ctx, input }) => {
        const entry = await getSisEntry(input.id, ctx.user.id);
        if (!entry) {
          throw new Error("SIS-Eintrag nicht gefunden");
        }

        // Build prompt from SIS data
        const prompt = buildMassnahmenplanPrompt(entry);
        
        // Call OpenAI API
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${input.apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Du bist ein erfahrener Pflegeexperte und erstellst individuelle Maßnahmenpläne basierend auf der Strukturierten Informationssammlung (SIS). 
                
Erstelle einen detaillierten, praxisnahen Maßnahmenplan, der:
- Auf die individuellen Bedürfnisse und Ressourcen der pflegebedürftigen Person eingeht
- Konkrete, umsetzbare Maßnahmen für jedes relevante Themenfeld enthält
- Die identifizierten Risiken berücksichtigt
- Die Wünsche und Perspektive der pflegebedürftigen Person (O-Ton) einbezieht
- Professionell und verständlich formuliert ist

Strukturiere den Maßnahmenplan nach Themenfeldern und priorisiere nach Dringlichkeit.`
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
});

function buildMassnahmenplanPrompt(entry: any): string {
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

  prompt += `
Bitte erstelle basierend auf diesen Informationen einen individuellen Maßnahmenplan.`;

  return prompt;
}

export type AppRouter = typeof appRouter;
