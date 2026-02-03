import { describe, expect, it } from "vitest";
import { generateSisPdfHtml } from "./pdfGenerator";

describe("PDF Generator", () => {
  const mockSisEntry = {
    patientName: "Max Mustermann",
    birthDate: "1945-03-15",
    conversationDate: "2026-02-03",
    nurseSignature: "Petra Pflegekraft",
    relativeOrCaregiver: "Anna Mustermann (Tochter)",
    oTon: "Ich möchte so selbstständig wie möglich bleiben. Mir ist wichtig, dass ich weiterhin am Gemeinschaftsleben teilnehmen kann.",
    themenfeld1: "Herr Mustermann ist zeitlich und örtlich orientiert. Er kann sich gut artikulieren und nimmt aktiv an Gesprächen teil.",
    themenfeld2: "Die Mobilität ist eingeschränkt. Herr Mustermann benötigt einen Rollator für längere Strecken.",
    themenfeld3: "Diabetes mellitus Typ 2, Bluthochdruck. Regelmäßige Medikamenteneinnahme erforderlich.",
    themenfeld4: "Körperpflege weitgehend selbstständig mit Hilfestellung beim Duschen. Ankleiden selbstständig.",
    themenfeld5: "Guter Kontakt zur Familie. Tochter besucht regelmäßig. Nimmt gerne an Gruppenaktivitäten teil.",
    themenfeld6: "Bewohnt ein Einzelzimmer. Fühlt sich wohl in der Einrichtung.",
    riskMatrix: {
      dekubitus: { tf1: { ja: false, weitere: false }, tf2: { ja: true, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
      sturz: { tf1: { ja: false, weitere: false }, tf2: { ja: true, weitere: true }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
      inkontinenz: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: true, weitere: false }, tf5: { ja: false, weitere: false } },
      schmerz: { tf1: { ja: false, weitere: false }, tf2: { ja: true, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
      ernaehrung: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: true, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
      sonstiges: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
    },
    massnahmenplan: "## Maßnahmenplan\n\n### Mobilität\n- Tägliche Gehübungen mit Rollator\n- Sturzprävention beachten\n\n### Selbstversorgung\n- Unterstützung beim Duschen\n- Inkontinenzversorgung",
    pruefungsergebnis: "## Prüfungsergebnis\n\nDie SIS ist vollständig ausgefüllt. Alle Themenfelder wurden berücksichtigt.",
  };

  it("generates valid HTML document", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"de\">");
    expect(html).toContain("</html>");
  });

  it("includes patient name in header", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("Max Mustermann");
  });

  it("includes all meta information", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    // Date format depends on locale, just check the values are present
    expect(html).toContain("1945"); // Birth year
    expect(html).toContain("2026"); // Conversation year
    expect(html).toContain("Petra Pflegekraft");
    expect(html).toContain("Anna Mustermann (Tochter)");
  });

  it("includes O-Ton section", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("O-Ton");
    expect(html).toContain("Ich möchte so selbstständig wie möglich bleiben");
  });

  it("includes all Themenfelder", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("Themenfeld 1");
    expect(html).toContain("Kognitive und kommunikative Fähigkeiten");
    expect(html).toContain("Themenfeld 2");
    expect(html).toContain("Mobilität und Beweglichkeit");
    expect(html).toContain("Themenfeld 3");
    expect(html).toContain("Krankheitsbezogene Anforderungen");
    expect(html).toContain("Themenfeld 4");
    expect(html).toContain("Selbstversorgung");
    expect(html).toContain("Themenfeld 5");
    expect(html).toContain("Leben in sozialen Beziehungen");
    expect(html).toContain("Themenfeld 6");
    expect(html).toContain("Wohnen/Häuslichkeit");
  });

  it("includes risk matrix", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("Risikomatrix");
    expect(html).toContain("Dekubitus");
    expect(html).toContain("Sturz");
    expect(html).toContain("Inkontinenz");
    expect(html).toContain("Schmerz");
    expect(html).toContain("Ernährung");
  });

  it("includes Maßnahmenplan when present", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("Individueller Maßnahmenplan");
    expect(html).toContain("Mobilität");
    expect(html).toContain("Sturzprävention");
  });

  it("includes Prüfungsergebnis when present", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("SIS-Prüfungsergebnis");
    expect(html).toContain("vollständig ausgefüllt");
  });

  it("handles missing optional fields gracefully", () => {
    const minimalEntry = {
      patientName: "Test Patient",
    };
    
    const html = generateSisPdfHtml(minimalEntry);
    
    expect(html).toContain("Test Patient");
    expect(html).toContain("Keine Angaben");
    expect(html).not.toContain("Individueller Maßnahmenplan");
    expect(html).not.toContain("SIS-Prüfungsergebnis");
  });

  it("escapes HTML special characters", () => {
    const entryWithSpecialChars = {
      patientName: "Test <script>alert('xss')</script>",
      oTon: "Patient sagt: \"Mir geht's gut\" & alles ist ok",
    };
    
    const html = generateSisPdfHtml(entryWithSpecialChars);
    
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });

  it("includes proper CSS styling", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("<style>");
    expect(html).toContain("@page");
    expect(html).toContain("font-family");
  });

  it("includes footer with generation info", () => {
    const html = generateSisPdfHtml(mockSisEntry);
    
    expect(html).toContain("SIS Digital");
    expect(html).toContain("Strukturierte Informationssammlung");
  });
});

describe("PDF Export tRPC Endpoint", () => {
  it("should have appRouter defined with sis procedures", async () => {
    // This test verifies the router module exports correctly
    const { appRouter } = await import("./routers");
    
    expect(appRouter).toBeDefined();
    expect(appRouter._def).toBeDefined();
    // The actual endpoint test would require a full context setup
  });
});
