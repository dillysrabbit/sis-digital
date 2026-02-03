import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { SISForm, SISFormData } from "@/components/SISForm";
import { MassnahmenplanDisplay } from "@/components/MassnahmenplanDisplay";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function SISEditor() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const entryId = params.id ? parseInt(params.id) : null;
  const isNew = !entryId;

  const [currentEntryId, setCurrentEntryId] = useState<number | null>(entryId);
  const [massnahmenplan, setMassnahmenplan] = useState<string>("");

  // Fetch existing entry if editing
  const { data: existingEntry, isLoading: isLoadingEntry } = trpc.sis.get.useQuery(
    { id: entryId! },
    { enabled: !!entryId }
  );

  // Get API key
  const { data: apiKey, refetch: refetchApiKey } = trpc.settings.getFullApiKey.useQuery();

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
      toast.success("Maßnahmenplan erfolgreich generiert");
    },
    onError: (error) => {
      toast.error(`Fehler bei der Generierung: ${error.message}`);
    },
  });

  // Update massnahmenplan when entry is loaded
  useEffect(() => {
    if (existingEntry?.massnahmenplan) {
      setMassnahmenplan(existingEntry.massnahmenplan);
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
            <ApiKeySettings onApiKeySaved={refetchApiKey} />
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
              isSaving={createEntry.isPending || updateEntry.isPending}
              isGenerating={generatePlan.isPending}
            />
          </div>

          {/* Maßnahmenplan */}
          <div className="xl:col-span-1">
            <div className="sticky top-24">
              <MassnahmenplanDisplay
                plan={massnahmenplan}
                patientName={existingEntry?.patientName || "Patient"}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
