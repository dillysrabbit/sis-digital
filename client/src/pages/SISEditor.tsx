import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { sisApi } from "@/lib/sisApi";
import { SISForm, SISFormData } from "@/components/SISForm";
import { MassnahmenplanDisplay } from "@/components/MassnahmenplanDisplay";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Loader2, FileCheck, ClipboardCheck, FileDown } from "lucide-react";

export default function SISEditor() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const entryId = params.id ? parseInt(params.id) : null;
  const isNew = !entryId;

  const [currentEntryId, setCurrentEntryId] = useState<number | null>(entryId);
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [isLoadingEntry, setIsLoadingEntry] = useState(!!entryId);
  const [massnahmenplan, setMassnahmenplan] = useState<string>("");
  const [pruefungsergebnis, setPruefungsergebnis] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("massnahmenplan");
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isEditingCheck, setIsEditingCheck] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Fetch existing entry if editing
  const loadEntry = async () => {
    if (!entryId) return;
    try {
      setIsLoadingEntry(true);
      const entry = await sisApi("get", { id: entryId });
      setExistingEntry(entry);
      if (entry.massnahmenplan) setMassnahmenplan(entry.massnahmenplan);
      if (entry.pruefungsergebnis) setPruefungsergebnis(entry.pruefungsergebnis);
    } catch (err: any) {
      toast.error(`Fehler beim Laden: ${err.message}`);
    } finally {
      setIsLoadingEntry(false);
    }
  };

  useEffect(() => {
    loadEntry();
  }, [entryId]);

  const handleSave = async (data: SISFormData) => {
    setIsSaving(true);
    try {
      if (currentEntryId) {
        await sisApi("update", { id: currentEntryId, data });
        toast.success("SIS-Eintrag erfolgreich aktualisiert");
      } else {
        const result = await sisApi("create", data);
        setCurrentEntryId(result.id);
        toast.success("SIS-Eintrag erfolgreich erstellt");
        setLocation(`/sis/${result.id}`);
      }
    } catch (err: any) {
      toast.error(`Fehler beim Speichern: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePlan = async () => {
    const id = currentEntryId || entryId;
    if (!id) {
      toast.error("Bitte speichern Sie den Eintrag zuerst");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await sisApi("generatePlan", { id });
      setMassnahmenplan(result.plan);
      setActiveTab("massnahmenplan");
      toast.success("Maßnahmenplan erfolgreich generiert");
    } catch (err: any) {
      toast.error(`Fehler bei der Generierung: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckSis = async () => {
    const id = currentEntryId || entryId;
    if (!id) {
      toast.error("Bitte speichern Sie den Eintrag zuerst");
      return;
    }
    setIsChecking(true);
    try {
      const result = await sisApi("checkSis", { id });
      setPruefungsergebnis(result.result);
      setActiveTab("pruefung");
      toast.success("SIS-Prüfung erfolgreich abgeschlossen");
    } catch (err: any) {
      toast.error(`Fehler bei der Prüfung: ${err.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleExportPdf = async () => {
    const id = currentEntryId || entryId;
    if (!id) {
      toast.error("Bitte speichern Sie den Eintrag zuerst");
      return;
    }

    if (!existingEntry) {
      toast.error("SIS-Eintrag nicht gefunden. Bitte laden Sie die Seite neu.");
      return;
    }

    setIsExporting(true);
    try {
      const pdfUrl = `/api/pdf/export/${id}?t=${Date.now()}`;
      const printWindow = window.open(pdfUrl, '_blank');

      if (printWindow) {
        toast.success("PDF-Export wird geöffnet...");
      } else {
        toast.error("Pop-up wurde blockiert. Bitte erlauben Sie Pop-ups für diese Seite.");
      }
    } catch (error) {
      toast.error(`Export fehlgeschlagen: ${(error as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoadingEntry && entryId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initialData = existingEntry
    ? {
        patientName: existingEntry.patientName,
        birthDate: existingEntry.birthDate || "",
        conversationDate: existingEntry.conversationDate || "",
        nurseSignature: existingEntry.nurseSignature || "",
        relativeOrCaregiver: existingEntry.relativeOrCaregiver || "",
        oTon: existingEntry.oTon || "",
        themenfeld1: existingEntry.themenfeld1 || "",
        themenfeld2: existingEntry.themenfeld2 || "",
        themenfeld3: existingEntry.themenfeld3 || "",
        themenfeld4: existingEntry.themenfeld4 || "",
        themenfeld5: existingEntry.themenfeld5 || "",
        themenfeld6: existingEntry.themenfeld6 || "",
        riskMatrix: {
          ...existingEntry.riskMatrix as any,
          sonstiges: typeof (existingEntry.riskMatrix as any)?.sonstiges === 'string'
            ? {
                title: "Sonstiges",
                tf1: { ja: false, weitere: false },
                tf2: { ja: false, weitere: false },
                tf3: { ja: false, weitere: false },
                tf4: { ja: false, weitere: false },
                tf5: { ja: false, weitere: false }
              }
            : (existingEntry.riskMatrix as any)?.sonstiges
        },
      }
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container py-3 md:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Zurück</span>
              </Button>
              <h1 className="text-base md:text-xl font-semibold">
                {isNew ? "Neue SIS erstellen" : `SIS bearbeiten`}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExporting || !currentEntryId || !existingEntry}
                className="gap-1 md:gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">PDF exportieren</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="space-y-6">
          {/* SIS Form */}
          <div>
            <SISForm
              initialData={initialData}
              onSave={handleSave}
              onGeneratePlan={handleGeneratePlan}
              onCheckSis={handleCheckSis}
              isSaving={isSaving}
              isGenerating={isGenerating}
              isChecking={isChecking}
            />
          </div>

          {/* Results Panel */}
          <div>
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="massnahmenplan" className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Maßnahmenplan
                  </TabsTrigger>
                  <TabsTrigger value="pruefung" className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Prüfung
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="massnahmenplan">
                  <MassnahmenplanDisplay
                    plan={massnahmenplan}
                    patientName={existingEntry?.patientName || "Patient"}
                    sisEntryId={currentEntryId || undefined}
                    isEditing={isEditingPlan}
                    onEdit={() => setIsEditingPlan(true)}
                    onSave={async (newPlan) => {
                      if (currentEntryId) {
                        await sisApi("update", { id: currentEntryId, data: { massnahmenplan: newPlan } });
                        setMassnahmenplan(newPlan);
                        setIsEditingPlan(false);
                        toast.success("Maßnahmenplan gespeichert");
                      }
                    }}
                    onCancel={() => setIsEditingPlan(false)}
                    onVersionRestore={() => {
                      if (currentEntryId) {
                        loadEntry();
                      }
                    }}
                  />
                </TabsContent>

                <TabsContent value="pruefung">
                  <MassnahmenplanDisplay
                    plan={pruefungsergebnis}
                    patientName={existingEntry?.patientName || "Patient"}
                    title="SIS-Prüfungsergebnis"
                    emptyMessage="Noch keine Prüfung durchgeführt. Klicken Sie auf 'SIS prüfen', um eine Qualitätsprüfung der SIS durchzuführen."
                    icon="🔍"
                    isEditing={isEditingCheck}
                    onEdit={() => setIsEditingCheck(true)}
                    onSave={async (newCheck) => {
                      if (currentEntryId) {
                        await sisApi("update", { id: currentEntryId, data: { pruefungsergebnis: newCheck } });
                        setPruefungsergebnis(newCheck);
                        setIsEditingCheck(false);
                        toast.success("Prüfungsergebnis gespeichert");
                      }
                    }}
                    onCancel={() => setIsEditingCheck(false)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
