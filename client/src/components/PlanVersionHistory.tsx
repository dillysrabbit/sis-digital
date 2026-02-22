import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { History, RotateCcw, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface PlanVersionHistoryProps {
  sisEntryId: number;
  onRestore?: () => void;
}

export function PlanVersionHistory({ sisEntryId, onRestore }: PlanVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const { data: versions, isLoading, refetch } = trpc.planVersions.list.useQuery(
    { sisEntryId },
    { enabled: open }
  );

  const { data: selectedVersionData } = trpc.planVersions.get.useQuery(
    { versionId: selectedVersion! },
    { enabled: !!selectedVersion }
  );

  const restoreMutation = trpc.planVersions.restore.useMutation({
    onSuccess: () => {
      toast.success("Version erfolgreich wiederhergestellt");
      setOpen(false);
      setSelectedVersion(null);
      onRestore?.();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleRestore = (versionId: number) => {
    if (confirm("Möchten Sie diese Version wirklich wiederherstellen?")) {
      restoreMutation.mutate({ versionId });
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Verlauf
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Maßnahmenplan-Verlauf</DialogTitle>
          <DialogDescription>
            Frühere Versionen des Maßnahmenplans anzeigen und wiederherstellen
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !versions || versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Noch keine Versionen vorhanden
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Versionsliste */}
            <ScrollArea className="w-64 border rounded-md">
              <div className="p-2 space-y-1">
                {versions.map((version, index) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version.id)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedVersion === version.id
                        ? "bg-accent border-accent-foreground/20"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="font-medium text-sm">
                      Version {versions.length - index}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(version.createdAt)}
                    </div>
                    {index === 0 && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        Aktuell
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Versionsinhalt */}
            <div className="flex-1 flex flex-col min-w-0">
              {selectedVersion && selectedVersionData ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">
                        Version {versions?.findIndex((v) => v.id === selectedVersion) !== undefined
                          ? versions.length - versions.findIndex((v) => v.id === selectedVersion)
                          : ""}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedVersionData.createdAt)}
                      </p>
                    </div>
                    {versions && versions[0].id !== selectedVersion && (
                      <Button
                        onClick={() => handleRestore(selectedVersion)}
                        disabled={restoreMutation.isPending}
                        className="gap-2"
                      >
                        {restoreMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Wiederherstellen
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="flex-1 border rounded-md p-4">
                    <div className="prose prose-sm max-w-none">
                      <Streamdown>{selectedVersionData.content}</Streamdown>
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Wählen Sie eine Version aus</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
