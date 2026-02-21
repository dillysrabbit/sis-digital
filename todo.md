# SIS Digital - TODO

## Datenbankschema
- [x] SIS-Einträge Tabelle erstellen (Stammdaten, O-Ton, Themenfelder, Risikomatrix)
- [x] Migration ausführen

## Frontend - SIS-Formular
- [x] Kopfbereich mit Stammdaten (Name, Geburtsdatum, Gespräch am, Pflegefachkraft, Angehöriger)
- [x] Feld A - O-Ton Freitextfeld (rot)
- [x] Themenfeld 1 - Kognitive und kommunikative Fähigkeiten (orange)
- [x] Themenfeld 2 - Mobilität und Beweglichkeit (gelb)
- [x] Themenfeld 3 - Krankheitsbezogene Anforderungen und Belastungen (grün)
- [x] Themenfeld 4 - Selbstversorgung (lila)
- [x] Themenfeld 5 - Leben in sozialen Beziehungen (blau)
- [x] Themenfeld 6 - Wohnen/Häuslichkeit (türkis)
- [x] Interaktive Risikomatrix (Dekubitus, Sturz, Inkontinenz, Schmerz, Ernährung, Sonstiges)

## OpenAI-Integration
- [x] API-Key Eingabe/Verwaltung
- [x] Maßnahmenplan-Generierung per Knopfdruck
- [x] Anzeige des generierten Maßnahmenplans

## Export-Funktionen
- [x] Teilen-Button für Maßnahmenplan
- [x] Kopieren-Button für Maßnahmenplan

## Tests
- [x] Unit-Tests für tRPC-Prozeduren
- [x] Validierung der Formularfelder

## Admin-Bereich
- [x] Admin-Seite für Systemprompt-Editor erstellen
- [x] Systemprompt in Datenbank speichern
- [x] Zugriffsschutz nur für Eigentümer (Admin-Rolle)
- [x] Navigation zum Admin-Bereich (nur für Admin sichtbar)

## Admin-Erweiterungen
- [x] Modell-Auswahl (GPT-4o, GPT-4, GPT-3.5-turbo) im Admin-Bereich
- [x] Modell-Einstellung in Datenbank speichern
- [x] Prompt-Vorlagen System implementieren
- [x] Vordefinierte Vorlagen (ausführlich, kompakt, risikofokussiert, ressourcenorientiert, für Angehörige)
- [x] Vorlagen-Auswahl im Admin-Bereich

## SIS-Prüfung Funktion
- [x] Backend: Separate Einstellungen für SIS-Prüfung (Systemprompt, Modell)
- [x] Backend: API-Endpunkt für SIS-Prüfung
- [x] Admin: Separater Bereich für SIS-Prüfung Einstellungen
- [x] Admin: Eigene Prompt-Vorlagen für Prüfung
- [x] Admin: Eigene Modell-Auswahl für Prüfung
- [x] Frontend: "SIS prüfen" Button im SIS-Editor
- [x] Frontend: Anzeige des Prüfungsergebnisses
- [x] Tests für SIS-Prüfung Funktionen

## PDF-Export Funktion
- [x] Backend: PDF-Generierung mit allen SIS-Daten
- [x] Backend: Maßnahmenplan und Prüfungsergebnis im PDF
- [x] Frontend: Export-Button im SIS-Editor
- [x] Frontend: Download-Funktion für generiertes PDF
- [x] Tests für PDF-Export

## Bugs
- [x] Themenfelder-Inhalte verschwinden manchmal nach dem Speichern (Fix: useRef um nur beim initialen Laden zu synchronisieren)
- [x] Bug: Prompts können im Admin-Bereich nicht gespeichert werden (Fix: useRef für initiale Werte, Änderungserkennung verbessert)
- [x] Bug: PDF-Export schlägt fehl (Fix: Express-Endpunkt statt tRPC für große HTML-Dokumente)

## Neue Features
- [x] Editierbares "Sonstiges"-Feld in der Risikomatrix
- [x] Bearbeiten-Button für Maßnahmenplan
- [x] Speicherfunktion für bearbeiteten Maßnahmenplan
- [x] Bug: PDF-Export enthält nicht die aktuelle Version der SIS (Fix: Cache-Buster und no-cache Headers)
- [x] KRITISCH: Speichern der SIS schlägt fehl - invalid_type bei riskMatrix.sonstiges (Fix: Migration von alten Daten beim Laden)

## Risikomatrix-Korrektur
- [x] Sonstiges-Risiko als sechste Spalte mit editierbarem Titel
- [x] Sonstiges-Risiko mit gleichen Checkboxen wie andere Risiken
- [x] Datenbankschema für editierbaren Risiko-Titel anpassen
- [x] UI als 6-spaltige Tabelle umbauen

## Textbausteine-System
- [x] Datenbankschema für Textbausteine erstellen
- [x] Backend-API für Textbausteine-Verwaltung (CRUD)
- [x] Admin-Seite für Textbausteine-Verwaltung
- [x] Dropdown-Button in Themenfeldern zum Einfügen
- [x] Kategorisierung nach Themenfeldern
- [ ] Vordefinierte Standard-Bausteine (optional - kann vom Admin erstellt werden)
- [x] Mobile Layout-Fix: Dialog scrollbar und Speichern-Button auf iPhone erreichbar

## Textbausteine für Maßnahmenplan
- [x] Kategorien von Themenfeldern zu Maßnahmenplan-Bereichen ändern (Mobilität, Ernährung, Körperpflege, etc.)
- [x] Dropdown-Button im Maßnahmenplan-Editor zum Einfügen von Textbausteinen
- [x] Textbausteine an Cursor-Position einfügen können
