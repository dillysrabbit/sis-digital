import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Key, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ApiKeySettingsProps {
  onApiKeySaved?: () => void;
}

export function ApiKeySettings({ onApiKeySaved }: ApiKeySettingsProps) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: maskedKey, refetch } = trpc.settings.getApiKey.useQuery();
  const saveApiKey = trpc.settings.setApiKey.useMutation({
    onSuccess: () => {
      toast.success("API-Key erfolgreich gespeichert");
      setApiKey("");
      setOpen(false);
      refetch();
      onApiKeySaved?.();
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Bitte geben Sie einen API-Key ein");
      return;
    }
    saveApiKey.mutate({ apiKey: apiKey.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          API-Einstellungen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API-Key
          </DialogTitle>
          <DialogDescription>
            Geben Sie Ihren OpenAI API-Key ein, um Maßnahmenpläne automatisch generieren zu lassen.
            Der Key wird sicher gespeichert und nur für die Generierung verwendet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {maskedKey && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Aktueller Key:</span> {maskedKey}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="apiKey">Neuer API-Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>
              Sie können einen API-Key unter{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                platform.openai.com/api-keys
              </a>{" "}
              erstellen.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saveApiKey.isPending} className="gap-2">
            {saveApiKey.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
