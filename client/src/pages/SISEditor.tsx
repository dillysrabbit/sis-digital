import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { SISForm, SISFormData } from "@/components/SISForm";
import { MassnahmenplanDisplay } from "@/components/MassnahmenplanDisplay";
import { ApiKeySettings } from "@/components/ApiKeySettings";
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
  const [massnahmenplan, setMassnahmenplan] = useState<string>("");
  const [pruefungsergebnis, setPruefungsergebnis] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("massnahmenplan");
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isEditingCheck, setIsEditingCheck] = useState(false);

  // Fetch existing entry if editing
  const { data: existingEntry, isLoading: isLoadingEntry } = trpc.sis.get.useQuery(
    { id: entryId! },
    { enabled: !!entryId }
  );

  // Get API key
  const { data: apiKey, refetch: refetchApiKey } = trpc.settings.getFullApiKey.useQuery();
  
  // Get tRPC utils for PDF export
  const utils = trpc.useUtils();

  // Mutations
  const createEntry = trpc.sis.create.useMutation({
    onSuccess: (data) => {
      setCurrentEntryId(data.id);
      toast.success("SIS-Eintrag erfolgreich erstellt");
      setLocation(`/sis/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Erstellen: ${error.message}`);
    },
  });

  const updateEntry = trpc.sis.update.useMutation({
    onSuccess: () => {
      toast.success("SIS-Eintrag erfolgreich aktualisiert");
    },
    onError: (error) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
  });

  const generatePlan = trpc.sis.generatePlan.useMutation({
    onSuccess: (data) => {
      setMassnahmenplan(data.plan);
      setActiveTab("massnahmenplan");
      toast.success("Maßnahmenplan erfolgreich generiert");
    },
    onError: (error) => {
      toast.error(`Fehler bei der Generierung: ${error.message}`);
    },
  });

  const checkSis = trpc.sis.checkSis.useMutation({
    onSuccess: (data) => {
      setPruefungsergebnis(data.result);
      setActiveTab("pruefung");
      toast.success("SIS-Prüfung erfolgreich abgeschlossen");
    },
    onError: (error) => {
      toast.error(`Fehler bei der Prüfung: ${error.message}`);
    },
  });

  // Update massnahmenplan and pruefungsergebnis when entry is loaded
  useEffect(() => {
    if (existingEntry?.massnahmenplan) {
      setMassnahmenplan(existingEntry.massnahmenplan);
    }
    if (existingEntry?.pruefungsergebnis) {
      setPruefungsergebnis(existingEntry.pruefungsergebnis);
    }
  }, [existingEntry]);

  const handleSave = async (data: SISFormData) => {
    if (currentEntryId) {
      await updateEntry.mutateAsync({ id: currentEntryId, data });
    } else {
      await createEntry.mutateAsync(data);
    }
  };

  const handleGeneratePlan = async () => {
    const id = currentEntryId || entryId;
    if (!id) {
      toast.error("Bitte speichern Sie den Eintrag zuerst");
      return;
    }

    // API key is optional - server will use system key if available
    await generatePlan.mutateAsync({ id, apiKey: apiKey || undefined });
  };

  const handleCheckSis = async () => {
    const id = currentEntryId || entryId;
    if (!id) {
      toast.error("Bitte speichern Sie den Eintrag zuerst");
      return;
    }

    // API key is optional - server will use system key if available
    await checkSis.mutateAsync({ id, apiKey: apiKey || undefined });
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
      // Open PDF in new window using Express endpoint
      const pdfUrl = `/api/pdf/export/${id}`;
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        toast.success("PDF-Export wird ge\u00f6ffnet...");
      } else {
        toast.error("Pop-up wurde blockiert. Bitte erlauben Sie Pop-ups f\u00fcr diese Seite.");
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
        riskMatrix: existingEntry.riskMatrix as any,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </Button>
              <h1 className="text-xl font-semibold">
                {isNew ? "Neue SIS erstellen" : `SIS bearbeiten`}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPdf}
                disabled={isExporting || !currentEntryId || !existingEntry}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                PDF exportieren
              </Button>
              <ApiKeySettings onApiKeySaved={refetchApiKey} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* SIS Form */}
          <div className="xl:col-span-2">
            <SISForm
              initialData={initialData}
              onSave={handleSave}
              onGeneratePlan={handleGeneratePlan}
              onCheckSis={handleCheckSis}
              isSaving={createEntry.isPending || updateEntry.isPending}
              isGenerating={generatePlan.isPending}
              isChecking={checkSis.isPending}
            />
          </div>

          {/* Results Panel */}
          <div className="xl:col-span-1">
            <div className="sticky top-24">
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
                    isEditing={isEditingPlan}
                    onEdit={() => setIsEditingPlan(true)}
                    onSave={async (newPlan) => {
                      if (currentEntryId) {
                        await updateEntry.mutateAsync({ id: currentEntryId, data: { massnahmenplan: newPlan } });
                        setMassnahmenplan(newPlan);
                        setIsEditingPlan(false);
                        toast.success("Maßnahmenplan gespeichert");
                      }
                    }}
                    onCancel={() => setIsEditingPlan(false)}
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
                        await updateEntry.mutateAsync({ id: currentEntryId, data: { pruefungsergebnis: newCheck } });
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
