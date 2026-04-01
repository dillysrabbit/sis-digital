import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Plus, FileText, Trash2, Edit, Calendar, User, Loader2, LogIn, ClipboardList, Shield, Heart } from "lucide-react";
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

function CaritasLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Red square background */}
      <rect x="0" y="0" width="100" height="100" rx="4" fill="#E2001A" />
      {/* White cross */}
      <rect x="30" y="8" width="40" height="84" fill="white" />
      <rect x="8" y="30" width="84" height="40" fill="white" />
      {/* Top-left flame */}
      <path d="M28 28C28 28 20 20 14 22C14 22 18 14 28 10C28 10 22 18 28 28Z" fill="#E2001A" />
      <path d="M28 10C28 10 24 18 26 24C26 24 20 16 18 12C18 12 22 8 28 10Z" fill="#E2001A" />
      <path d="M10 28C10 28 18 24 24 26C24 26 16 20 12 18C12 18 8 22 10 28Z" fill="#E2001A" />
      {/* Top-right flame */}
      <path d="M72 28C72 28 80 20 86 22C86 22 82 14 72 10C72 10 78 18 72 28Z" fill="#E2001A" />
      <path d="M72 10C72 10 76 18 74 24C74 24 80 16 82 12C82 12 78 8 72 10Z" fill="#E2001A" />
      <path d="M90 28C90 28 82 24 76 26C76 26 84 20 88 18C88 18 92 22 90 28Z" fill="#E2001A" />
      {/* Bottom-left flame */}
      <path d="M28 72C28 72 20 80 14 78C14 78 18 86 28 90C28 90 22 82 28 72Z" fill="#E2001A" />
      <path d="M28 90C28 90 24 82 26 76C26 76 20 84 18 88C18 88 22 92 28 90Z" fill="#E2001A" />
      <path d="M10 72C10 72 18 76 24 74C24 74 16 80 12 82C12 82 8 78 10 72Z" fill="#E2001A" />
      {/* Bottom-right flame */}
      <path d="M72 72C72 72 80 80 86 78C86 78 82 86 72 90C72 90 78 82 72 72Z" fill="#E2001A" />
      <path d="M72 90C72 90 76 82 74 76C74 76 80 84 82 88C82 88 78 92 72 90Z" fill="#E2001A" />
      <path d="M90 72C90 72 82 76 76 74C76 74 84 80 88 82C88 82 92 78 90 72Z" fill="#E2001A" />
      {/* "caritas" text at bottom */}
      <text x="50" y="115" textAnchor="middle" fill="#E2001A" fontSize="14" fontWeight="bold" fontFamily="serif" fontStyle="italic">
        caritas
      </text>
    </svg>
  );
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: entries, isLoading: entriesLoading, refetch } = trpc.sis.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: isAdmin } = trpc.admin.isAdmin.useQuery(undefined, {
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        {/* Hero Section */}
        <div className="container py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Heart className="h-4 w-4" />
              Caritas Pflegedokumentation
            </div>
            <div className="flex items-center justify-center gap-4 mb-6">
              <CaritasLogo className="h-16 w-16" />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                SIS Digital
              </h1>
            </div>
            <p className="text-xl text-gray-600 mb-4">
              Strukturierte Informationssammlung
            </p>
            <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
              Erfassen Sie pflegerelevante Informationen digital und generieren Sie
              individuelle Maßnahmenpläne mit KI-Unterstützung.
            </p>
            <Button size="lg" onClick={() => setLocation("/login")} className="gap-2">
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
              <CaritasLogo className="h-7 w-7" />
              <h1 className="text-xl font-semibold">Caritas SIS Digital</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Angemeldet als {user?.name || user?.email || "Benutzer"}
              </span>
              {isAdmin && (
                <Button variant="outline" onClick={() => setLocation("/admin")} className="gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              )}
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
