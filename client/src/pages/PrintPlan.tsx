import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function PrintPlan() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();

  const { data: entry, isLoading } = trpc.sis.get.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  useEffect(() => {
    // Auto-print after content loads (optional)
    if (entry && !isLoading) {
      // Uncomment to enable auto-print:
      // setTimeout(() => window.print(), 500);
    }
  }, [entry, isLoading]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ungültige SIS-ID</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">SIS-Eintrag nicht gefunden</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    setLocation(`/sis/${id}`);
  };

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-container {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Druckansicht - Maßnahmenplan</h1>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Drucken
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Schließen
            </Button>
          </div>
        </div>
      </div>

      {/* Print content */}
      <div className="print-container container py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 pb-4 border-b-2 border-gray-300">
          <h1 className="text-2xl font-bold mb-2">Individueller Maßnahmenplan</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Patient/Bewohner:</span> {entry.patientName}
            </div>
            <div>
              <span className="font-semibold">Erstellt am:</span>{" "}
              {new Date(entry.createdAt).toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>

        {/* Maßnahmenplan Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Maßnahmenplan</h2>
            {entry.massnahmenplan ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {entry.massnahmenplan}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">Kein Maßnahmenplan vorhanden</p>
            )}
          </div>

          {/* Prüfung/Evaluation */}
          {entry.pruefungsergebnis && (
            <div className="mt-8 pt-6 border-t-2 border-gray-300">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Prüfung/Evaluation</h2>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {entry.pruefungsergebnis}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-500">
          <p>Erstellt mit SIS Digital - Strukturierte Informationssammlung</p>
          <p>Gedruckt am: {new Date().toLocaleString("de-DE")}</p>
        </div>
      </div>
    </>
  );
}
