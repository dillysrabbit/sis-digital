import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, Check, FileText, ClipboardCheck, Edit } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { TextBlockButton } from "./TextBlockButton";

interface MassnahmenplanDisplayProps {
  plan: string;
  patientName: string;
  title?: string;
  emptyMessage?: string;
  icon?: string;
  onEdit?: () => void;
  onSave?: (newPlan: string) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function MassnahmenplanDisplay({ 
  plan, 
  patientName, 
  title = "Individueller Maßnahmenplan",
  emptyMessage = "Noch kein Maßnahmenplan generiert. Füllen Sie das SIS-Formular aus und klicken Sie auf 'Maßnahmenplan generieren'.",
  icon = "📋",
  onEdit,
  onSave,
  onCancel,
  isEditing = false
}: MassnahmenplanDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [editedPlan, setEditedPlan] = useState(plan);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    setEditedPlan(plan);
  }, [plan]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plan);
      setCopied(true);
      toast.success("In die Zwischenablage kopiert");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} für ${patientName}`,
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

  // Determine if this is a check result based on icon
  const isCheckResult = icon === "🔍";
  const gradientClass = isCheckResult 
    ? "bg-gradient-to-r from-orange-500 to-orange-600" 
    : "bg-gradient-to-r from-green-600 to-green-700";

  if (!plan) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          {isCheckResult ? (
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          ) : (
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          )}
          <p className="whitespace-pre-line">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={`${gradientClass} text-white rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            {title}
          </CardTitle>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onEdit}
                className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Edit className="h-4 w-4" />
                Bearbeiten
              </Button>
            )}
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
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <textarea
                ref={textareaRef}
                value={editedPlan}
                onChange={(e) => setEditedPlan(e.target.value)}
                className="flex-1 min-h-[400px] p-4 border rounded-md font-mono text-sm"
              />
              <TextBlockButton
                onSelect={(text: string) => {
                  const textarea = textareaRef.current;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newText = editedPlan.substring(0, start) + text + editedPlan.substring(end);
                    setEditedPlan(newText);
                    // Set cursor position after inserted text
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + text.length, start + text.length);
                    }, 0);
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedPlan(plan);
                  onCancel?.();
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => onSave?.(editedPlan)}
                className="bg-green-600 hover:bg-green-700"
              >
                Speichern
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <Streamdown>{plan}</Streamdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
