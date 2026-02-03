import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface MassnahmenplanDisplayProps {
  plan: string;
  patientName: string;
}

export function MassnahmenplanDisplay({ plan, patientName }: MassnahmenplanDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      toast.success("Maßnahmenplan in die Zwischenablage kopiert");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Maßnahmenplan für ${patientName}`,
          text: plan,
        });
        toast.success("Erfolgreich geteilt");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Teilen fehlgeschlagen");
        }
      }
    } else {
      // Fallback: Copy to clipboard
      handleCopy();
      toast.info("Teilen nicht verfügbar - Text wurde kopiert");
    }
  };

  if (!plan) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Noch kein Maßnahmenplan generiert.</p>
          <p className="text-sm mt-2">
            Füllen Sie das SIS-Formular aus und klicken Sie auf "Maßnahmenplan generieren".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Individueller Maßnahmenplan
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert" : "Kopieren"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Share2 className="h-4 w-4" />
              Teilen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="prose prose-sm max-w-none">
          <Streamdown>{plan}</Streamdown>
        </div>
      </CardContent>
    </Card>
  );
}
