import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Plus, FileText, Trash2, Edit, Calendar, User, Loader2, LogIn, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: entries, isLoading: entriesLoading, refetch } = trpc.sis.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteEntry = trpc.sis.delete.useMutation({
    onSuccess: () => {
      toast.success("SIS-Eintrag gelöscht");
      refetch();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Hero Section */}
        <div className="container py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <ClipboardList className="h-4 w-4" />
              Digitale Pflegedokumentation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              SIS Digital
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Strukturierte Informationssammlung
            </p>
            <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
              Erfassen Sie pflegerelevante Informationen digital und generieren Sie 
              individuelle Maßnahmenpläne mit KI-Unterstützung.
            </p>
            <Button size="lg" onClick={() => window.location.href = getLoginUrl()} className="gap-2">
              <LogIn className="h-5 w-5" />
              Anmelden um zu starten
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
            <Card className="border-t-4 border-t-[var(--sis-oton)]">
              <CardHeader>
                <CardTitle className="text-lg">O-Ton erfassen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Dokumentieren Sie die Perspektive und Wünsche der pflegebedürftigen Person in deren eigenen Worten.
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-[var(--sis-tf3)]">
              <CardHeader>
                <CardTitle className="text-lg">6 Themenfelder</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Strukturierte Erfassung aller relevanten Pflegebereiche von Kognition bis Wohnen.
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-[var(--sis-tf5)]">
              <CardHeader>
                <CardTitle className="text-lg">KI-Maßnahmenplan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Automatische Generierung individueller Maßnahmenpläne basierend auf Ihren Eingaben.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">SIS Digital</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Angemeldet als {user?.name || user?.email || "Benutzer"}
              </span>
              <Button onClick={() => setLocation("/sis/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                Neue SIS
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Ihre SIS-Einträge</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Strukturierten Informationssammlungen
          </p>
        </div>

        {entriesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {entry.patientName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {entry.conversationDate
                          ? new Date(entry.conversationDate).toLocaleDateString("de-DE")
                          : "Kein Datum"}
                      </CardDescription>
                    </div>
                    {entry.massnahmenplan && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <FileText className="h-3 w-3" />
                        Plan
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {entry.oTon && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      "{entry.oTon}"
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => setLocation(`/sis/${entry.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                      Bearbeiten
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>SIS-Eintrag löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchten Sie den SIS-Eintrag für "{entry.patientName}" wirklich löschen? 
                            Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteEntry.mutate({ id: entry.id })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Keine SIS-Einträge vorhanden</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie Ihren ersten SIS-Eintrag, um loszulegen.
              </p>
              <Button onClick={() => setLocation("/sis/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                Erste SIS erstellen
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
