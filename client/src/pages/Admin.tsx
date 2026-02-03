import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, RotateCcw, Save, Shield, AlertTriangle, Cpu, FileText, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");

  const { data: isAdmin, isLoading: isAdminLoading } = trpc.admin.isAdmin.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: systemPrompt, isLoading: isPromptLoading } = trpc.admin.getSystemPrompt.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const { data: models } = trpc.admin.getModels.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const { data: currentModel } = trpc.admin.getSelectedModel.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const { data: templates } = trpc.admin.getPromptTemplates.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const savePrompt = trpc.admin.setSystemPrompt.useMutation({
    onSuccess: () => {
      toast.success("Systemprompt erfolgreich gespeichert");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
  });

  const resetPrompt = trpc.admin.resetSystemPrompt.useMutation({
    onSuccess: (data) => {
      setPrompt(data.prompt);
      setHasChanges(false);
      toast.success("Systemprompt auf Standard zurückgesetzt");
    },
    onError: (error) => {
      toast.error(`Fehler beim Zurücksetzen: ${error.message}`);
    },
  });

  const setModelMutation = trpc.admin.setModel.useMutation({
    onSuccess: () => {
      toast.success("Modell erfolgreich geändert");
    },
    onError: (error) => {
      toast.error(`Fehler beim Ändern des Modells: ${error.message}`);
    },
  });

  const applyTemplate = trpc.admin.applyTemplate.useMutation({
    onSuccess: (data) => {
      setPrompt(data.prompt);
      setHasChanges(false);
      toast.success("Vorlage erfolgreich angewendet");
    },
    onError: (error) => {
      toast.error(`Fehler beim Anwenden der Vorlage: ${error.message}`);
    },
  });

  useEffect(() => {
    if (systemPrompt) {
      setPrompt(systemPrompt);
    }
  }, [systemPrompt]);

  useEffect(() => {
    if (currentModel) {
      setSelectedModel(currentModel);
    }
  }, [currentModel]);

  // Loading state
  if (authLoading || isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Nicht angemeldet</CardTitle>
            <CardDescription>
              Bitte melden Sie sich an, um auf den Admin-Bereich zuzugreifen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zur Startseite
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not admin
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Zugriff verweigert</CardTitle>
            <CardDescription>
              Sie haben keine Berechtigung, auf den Admin-Bereich zuzugreifen.
              Dieser Bereich ist nur für Administratoren zugänglich.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zur Startseite
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    setHasChanges(value !== systemPrompt);
  };

  const handleSave = () => {
    savePrompt.mutate({ prompt });
  };

  const handleReset = () => {
    if (confirm("Möchten Sie den Systemprompt wirklich auf den Standard zurücksetzen?")) {
      resetPrompt.mutate();
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setModelMutation.mutate({ model });
  };

  const handleApplyTemplate = (templateId: string) => {
    if (hasChanges) {
      if (!confirm("Sie haben ungespeicherte Änderungen. Möchten Sie die Vorlage trotzdem anwenden?")) {
        return;
      }
    }
    applyTemplate.mutate({ templateId });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold">Admin-Bereich</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Angemeldet als <strong>{user.name}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-purple-600" />
                KI-Modell auswählen
              </CardTitle>
              <CardDescription>
                Wählen Sie das OpenAI-Modell für die Maßnahmenplan-Generierung.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedModel} onValueChange={handleModelChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Modell auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-gray-500">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {models && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedModel === model.id
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleModelChange(model.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{model.name}</span>
                          {selectedModel === model.id && (
                            <Check className="h-4 w-4 text-purple-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{model.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prompt Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Prompt-Vorlagen
              </CardTitle>
              <CardDescription>
                Wählen Sie eine vordefinierte Vorlage als Ausgangspunkt für Ihren Systemprompt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates?.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all"
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Klicken Sie auf eine Vorlage, um sie als Systemprompt zu übernehmen.
              </p>
            </CardContent>
          </Card>

          {/* System Prompt Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                KI-Systemprompt bearbeiten
              </CardTitle>
              <CardDescription>
                Hier können Sie den Systemprompt anpassen, der die KI bei der Generierung 
                von Maßnahmenplänen instruiert. Änderungen wirken sich auf alle zukünftigen 
                Generierungen aus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isPromptLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Systemprompt
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => handlePromptChange(e.target.value)}
                      placeholder="Geben Sie hier den Systemprompt ein..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Der Systemprompt definiert, wie die KI auf die SIS-Daten reagiert und 
                      den Maßnahmenplan strukturiert.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={resetPrompt.isPending}
                    >
                      {resetPrompt.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Auf Standard zurücksetzen
                    </Button>

                    <Button
                      onClick={handleSave}
                      disabled={!hasChanges || savePrompt.isPending}
                    >
                      {savePrompt.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Änderungen speichern
                    </Button>
                  </div>

                  {hasChanges && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Hinweis:</strong> Sie haben ungespeicherte Änderungen.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tipps für einen guten Systemprompt</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Definieren Sie klar die Rolle der KI (z.B. "erfahrener Pflegeexperte")</li>
                <li>Geben Sie konkrete Anweisungen zur Struktur des Maßnahmenplans</li>
                <li>Betonen Sie wichtige Aspekte wie Individualität und Praxisnähe</li>
                <li>Weisen Sie auf die Berücksichtigung von Risiken und Ressourcen hin</li>
                <li>Legen Sie den gewünschten Sprachstil fest (professionell, verständlich)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
