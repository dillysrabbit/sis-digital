import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, RotateCcw, Save, Shield, AlertTriangle, Cpu, FileText, Check, ClipboardCheck, FileCheck } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  
  // Maßnahmenplan states
  const [planPrompt, setPlanPrompt] = useState("");
  const [planHasChanges, setPlanHasChanges] = useState(false);
  const [planSelectedModel, setPlanSelectedModel] = useState("");
  const planInitialPromptRef = useRef<string | null>(null);
  
  // SIS-Prüfung states
  const [checkPrompt, setCheckPrompt] = useState("");
  const [checkHasChanges, setCheckHasChanges] = useState(false);
  const [checkSelectedModel, setCheckSelectedModel] = useState("");
  const checkInitialPromptRef = useRef<string | null>(null);

  const isAdminVerified = typeof window !== "undefined" && sessionStorage.getItem("adminVerified") === "true";
  const { data: isAdmin, isLoading: isAdminLoading } = trpc.admin.isAdmin.useQuery(undefined, {
    enabled: !!user && !isAdminVerified,
    retry: false,
  });
  const hasAdminAccess = isAdminVerified || isAdmin === true;

  // Maßnahmenplan queries
  const { data: planSystemPrompt, isLoading: isPlanPromptLoading } = trpc.admin.getSystemPrompt.useQuery(undefined, {
    enabled: hasAdminAccess,
  });

  const { data: models } = trpc.admin.getModels.useQuery(undefined, {
    enabled: hasAdminAccess,
  });

  const { data: planCurrentModel } = trpc.admin.getSelectedModel.useQuery(undefined, {
    enabled: hasAdminAccess,
  });

  const { data: planTemplates } = trpc.admin.getPromptTemplates.useQuery(undefined, {
    enabled: hasAdminAccess,
  });

  // SIS-Prüfung queries
  const { data: checkSystemPrompt, isLoading: isCheckPromptLoading } = trpc.admin.getCheckSystemPrompt.useQuery(undefined, {
    enabled: hasAdminAccess,
  });

  const { data: checkCurrentModel } = trpc.admin.getCheckSelectedModel.useQuery(undefined, {
    enabled: hasAdminAccess,
  });

  const { data: checkTemplates } = trpc.admin.getCheckPromptTemplates.useQuery(undefined, {
    enabled: hasAdminAccess,
  });

  // Maßnahmenplan mutations
  const savePlanPrompt = trpc.admin.setSystemPrompt.useMutation({
    onSuccess: () => {
      toast.success("Maßnahmenplan-Prompt erfolgreich gespeichert");
      setPlanHasChanges(false);
      // Aktualisiere den initialen Wert nach erfolgreichem Speichern
      planInitialPromptRef.current = planPrompt;
    },
    onError: (error) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
  });

  const resetPlanPrompt = trpc.admin.resetSystemPrompt.useMutation({
    onSuccess: (data) => {
      setPlanPrompt(data.prompt);
      setPlanHasChanges(false);
      planInitialPromptRef.current = data.prompt;
      toast.success("Maßnahmenplan-Prompt auf Standard zurückgesetzt");
    },
    onError: (error) => {
      toast.error(`Fehler beim Zurücksetzen: ${error.message}`);
    },
  });

  const setPlanModelMutation = trpc.admin.setModel.useMutation({
    onSuccess: () => {
      toast.success("Maßnahmenplan-Modell erfolgreich geändert");
    },
    onError: (error) => {
      toast.error(`Fehler beim Ändern des Modells: ${error.message}`);
    },
  });

  const applyPlanTemplate = trpc.admin.applyTemplate.useMutation({
    onSuccess: (data) => {
      setPlanPrompt(data.prompt);
      // Vorlage angewendet = es gibt Änderungen zum Speichern
      setPlanHasChanges(true);
      toast.success("Vorlage angewendet - bitte speichern Sie die Änderungen");
    },
    onError: (error) => {
      toast.error(`Fehler beim Anwenden der Vorlage: ${error.message}`);
    },
  });

  // SIS-Prüfung mutations
  const saveCheckPrompt = trpc.admin.setCheckSystemPrompt.useMutation({
    onSuccess: () => {
      toast.success("Prüfungs-Prompt erfolgreich gespeichert");
      setCheckHasChanges(false);
      // Aktualisiere den initialen Wert nach erfolgreichem Speichern
      checkInitialPromptRef.current = checkPrompt;
    },
    onError: (error) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
  });

  const resetCheckPrompt = trpc.admin.resetCheckSystemPrompt.useMutation({
    onSuccess: (data) => {
      setCheckPrompt(data.prompt);
      setCheckHasChanges(false);
      checkInitialPromptRef.current = data.prompt;
      toast.success("Prüfungs-Prompt auf Standard zurückgesetzt");
    },
    onError: (error) => {
      toast.error(`Fehler beim Zurücksetzen: ${error.message}`);
    },
  });

  const setCheckModelMutation = trpc.admin.setCheckModel.useMutation({
    onSuccess: () => {
      toast.success("Prüfungs-Modell erfolgreich geändert");
    },
    onError: (error) => {
      toast.error(`Fehler beim Ändern des Modells: ${error.message}`);
    },
  });

  const applyCheckTemplate = trpc.admin.applyCheckTemplate.useMutation({
    onSuccess: (data) => {
      setCheckPrompt(data.prompt);
      // Vorlage angewendet = es gibt Änderungen zum Speichern
      setCheckHasChanges(true);
      toast.success("Vorlage angewendet - bitte speichern Sie die Änderungen");
    },
    onError: (error) => {
      toast.error(`Fehler beim Anwenden der Vorlage: ${error.message}`);
    },
  });

  // Effects for Maßnahmenplan
  useEffect(() => {
    if (planSystemPrompt) {
      setPlanPrompt(planSystemPrompt);
      // Speichere den initialen Wert nur beim ersten Laden
      if (planInitialPromptRef.current === null) {
        planInitialPromptRef.current = planSystemPrompt;
      }
    }
  }, [planSystemPrompt]);

  useEffect(() => {
    if (planCurrentModel) {
      setPlanSelectedModel(planCurrentModel);
    }
  }, [planCurrentModel]);

  // Effects for SIS-Prüfung
  useEffect(() => {
    if (checkSystemPrompt) {
      setCheckPrompt(checkSystemPrompt);
      // Speichere den initialen Wert nur beim ersten Laden
      if (checkInitialPromptRef.current === null) {
        checkInitialPromptRef.current = checkSystemPrompt;
      }
    }
  }, [checkSystemPrompt]);

  useEffect(() => {
    if (checkCurrentModel) {
      setCheckSelectedModel(checkCurrentModel);
    }
  }, [checkCurrentModel]);

  // Loading state (skip if admin verified via password)
  if (authLoading || (!isAdminVerified && isAdminLoading)) {
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
  if (!hasAdminAccess) {
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

  // Maßnahmenplan handlers
  const handlePlanPromptChange = (value: string) => {
    setPlanPrompt(value);
    // Vergleiche mit dem initialen Wert, nicht mit dem aktuellen aus der Query
    setPlanHasChanges(value !== planInitialPromptRef.current);
  };

  const handlePlanSave = () => {
    savePlanPrompt.mutate({ prompt: planPrompt });
  };

  const handlePlanReset = () => {
    if (confirm("Möchten Sie den Maßnahmenplan-Prompt wirklich auf den Standard zurücksetzen?")) {
      resetPlanPrompt.mutate();
    }
  };

  const handlePlanModelChange = (model: string) => {
    setPlanSelectedModel(model);
    setPlanModelMutation.mutate({ model });
  };

  const handleApplyPlanTemplate = (templateId: string) => {
    if (planHasChanges) {
      if (!confirm("Sie haben ungespeicherte Änderungen. Möchten Sie die Vorlage trotzdem anwenden?")) {
        return;
      }
    }
    applyPlanTemplate.mutate({ templateId });
  };

  // SIS-Prüfung handlers
  const handleCheckPromptChange = (value: string) => {
    setCheckPrompt(value);
    // Vergleiche mit dem initialen Wert, nicht mit dem aktuellen aus der Query
    setCheckHasChanges(value !== checkInitialPromptRef.current);
  };

  const handleCheckSave = () => {
    saveCheckPrompt.mutate({ prompt: checkPrompt });
  };

  const handleCheckReset = () => {
    if (confirm("Möchten Sie den Prüfungs-Prompt wirklich auf den Standard zurücksetzen?")) {
      resetCheckPrompt.mutate();
    }
  };

  const handleCheckModelChange = (model: string) => {
    setCheckSelectedModel(model);
    setCheckModelMutation.mutate({ model });
  };

  const handleApplyCheckTemplate = (templateId: string) => {
    if (checkHasChanges) {
      if (!confirm("Sie haben ungespeicherte Änderungen. Möchten Sie die Vorlage trotzdem anwenden?")) {
        return;
      }
    }
    applyCheckTemplate.mutate({ templateId });
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
              <Link href="/admin/textblocks">
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Textbausteine
                </Button>
              </Link>
              <span className="text-sm text-gray-500">
                Angemeldet als <strong>{user.name}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="massnahmenplan" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="massnahmenplan" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Maßnahmenplan
              </TabsTrigger>
              <TabsTrigger value="pruefung" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                SIS-Prüfung
              </TabsTrigger>
            </TabsList>

            {/* Maßnahmenplan Tab */}
            <TabsContent value="massnahmenplan" className="space-y-6">
              {/* Model Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-purple-600" />
                    KI-Modell für Maßnahmenplan
                  </CardTitle>
                  <CardDescription>
                    Wählen Sie das Claude-Modell für die Maßnahmenplan-Generierung.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {models && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {models.map((model) => (
                        <div
                          key={model.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            planSelectedModel === model.id
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => handlePlanModelChange(model.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{model.name}</span>
                            {planSelectedModel === model.id && (
                              <Check className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{model.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prompt Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-600" />
                    Prompt-Vorlagen für Maßnahmenplan
                  </CardTitle>
                  <CardDescription>
                    Wählen Sie eine vordefinierte Vorlage als Ausgangspunkt.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {planTemplates?.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 cursor-pointer transition-all"
                        onClick={() => handleApplyPlanTemplate(template.id)}
                      >
                        <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                        <p className="text-xs text-gray-500">{template.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Prompt Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Maßnahmenplan-Systemprompt
                  </CardTitle>
                  <CardDescription>
                    Dieser Prompt instruiert die KI bei der Generierung von Maßnahmenplänen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isPlanPromptLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={planPrompt}
                        onChange={(e) => handlePlanPromptChange(e.target.value)}
                        placeholder="Geben Sie hier den Systemprompt ein..."
                        className="min-h-[300px] font-mono text-sm"
                      />

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={handlePlanReset}
                          disabled={resetPlanPrompt.isPending}
                        >
                          {resetPlanPrompt.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-2 h-4 w-4" />
                          )}
                          Auf Standard zurücksetzen
                        </Button>

                        <Button
                          onClick={handlePlanSave}
                          disabled={!planHasChanges || savePlanPrompt.isPending}
                        >
                          {savePlanPrompt.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Änderungen speichern
                        </Button>
                      </div>

                      {planHasChanges && (
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
            </TabsContent>

            {/* SIS-Prüfung Tab */}
            <TabsContent value="pruefung" className="space-y-6">
              {/* Model Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-orange-600" />
                    KI-Modell für SIS-Prüfung
                  </CardTitle>
                  <CardDescription>
                    Wählen Sie das Claude-Modell für die SIS-Prüfung.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {models && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {models.map((model) => (
                        <div
                          key={model.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            checkSelectedModel === model.id
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => handleCheckModelChange(model.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{model.name}</span>
                            {checkSelectedModel === model.id && (
                              <Check className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{model.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prompt Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Prompt-Vorlagen für SIS-Prüfung
                  </CardTitle>
                  <CardDescription>
                    Wählen Sie eine vordefinierte Vorlage als Ausgangspunkt.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {checkTemplates?.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                        onClick={() => handleApplyCheckTemplate(template.id)}
                      >
                        <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                        <p className="text-xs text-gray-500">{template.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* System Prompt Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🔍</span>
                    SIS-Prüfungs-Systemprompt
                  </CardTitle>
                  <CardDescription>
                    Dieser Prompt instruiert die KI bei der Prüfung der SIS.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isCheckPromptLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={checkPrompt}
                        onChange={(e) => handleCheckPromptChange(e.target.value)}
                        placeholder="Geben Sie hier den Systemprompt ein..."
                        className="min-h-[300px] font-mono text-sm"
                      />

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={handleCheckReset}
                          disabled={resetCheckPrompt.isPending}
                        >
                          {resetCheckPrompt.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-2 h-4 w-4" />
                          )}
                          Auf Standard zurücksetzen
                        </Button>

                        <Button
                          onClick={handleCheckSave}
                          disabled={!checkHasChanges || saveCheckPrompt.isPending}
                        >
                          {saveCheckPrompt.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Änderungen speichern
                        </Button>
                      </div>

                      {checkHasChanges && (
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
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-orange-900 mb-2">💡 Tipps für die SIS-Prüfung</h3>
                  <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                    <li>Definieren Sie klare Prüfkriterien (Vollständigkeit, Plausibilität, etc.)</li>
                    <li>Geben Sie an, wie detailliert das Feedback sein soll</li>
                    <li>Weisen Sie auf MDK-relevante Aspekte hin, falls gewünscht</li>
                    <li>Legen Sie fest, ob konstruktive Verbesserungsvorschläge gegeben werden sollen</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
