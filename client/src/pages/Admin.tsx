import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, RotateCcw, Save, Shield, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: isAdmin, isLoading: isAdminLoading } = trpc.admin.isAdmin.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: systemPrompt, isLoading: isPromptLoading } = trpc.admin.getSystemPrompt.useQuery(undefined, {
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

  useEffect(() => {
    if (systemPrompt) {
      setPrompt(systemPrompt);
    }
  }, [systemPrompt]);

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
        <div className="max-w-4xl mx-auto">
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
          <Card className="mt-6 bg-blue-50 border-blue-200">
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
