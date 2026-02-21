import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, FileText, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  themenfeld1: "Themenfeld 1 - Kognition/Kommunikation",
  themenfeld2: "Themenfeld 2 - Mobilität",
  themenfeld3: "Themenfeld 3 - Krankheitsbezogen",
  themenfeld4: "Themenfeld 4 - Selbstversorgung",
  themenfeld5: "Themenfeld 5 - Soziale Beziehungen",
  themenfeld6: "Themenfeld 6 - Wohnen/Häuslichkeit",
  oTon: "O-Ton",
  allgemein: "Allgemein",
};

export default function TextBlocksAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("allgemein");

  const { data: isAdmin, isLoading: isAdminLoading } = trpc.admin.isAdmin.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: textBlocks, isLoading: isLoadingBlocks, refetch } = trpc.textBlocks.list.useQuery(undefined, {
    enabled: isAdmin === true,
  });

  const createMutation = trpc.textBlocks.create.useMutation({
    onSuccess: () => {
      toast.success("Textbaustein erfolgreich erstellt");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Fehler beim Erstellen: ${error.message}`);
    },
  });

  const updateMutation = trpc.textBlocks.update.useMutation({
    onSuccess: () => {
      toast.success("Textbaustein erfolgreich aktualisiert");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`);
    },
  });

  const deleteMutation = trpc.textBlocks.delete.useMutation({
    onSuccess: () => {
      toast.success("Textbaustein erfolgreich gelöscht");
      refetch();
    },
    onError: (error) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("allgemein");
    setEditingBlock(null);
  };

  const handleOpenDialog = (block?: any) => {
    if (block) {
      setEditingBlock(block);
      setTitle(block.title);
      setContent(block.content);
      setCategory(block.category);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Titel und Inhalt dürfen nicht leer sein");
      return;
    }

    if (editingBlock) {
      updateMutation.mutate({
        id: editingBlock.id,
        title,
        content,
        category: category as any,
      });
    } else {
      createMutation.mutate({
        title,
        content,
        category: category as any,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Möchten Sie diesen Textbaustein wirklich löschen?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (authLoading || isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Zugriff verweigert
            </CardTitle>
            <CardDescription>
              Sie haben keine Berechtigung, auf diese Seite zuzugreifen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück zur Startseite
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Textbausteine verwalten
              </h1>
              <p className="text-sm text-muted-foreground">
                Erstellen und verwalten Sie wiederverwendbare Textbausteine für die Themenfelder
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Neuer Textbaustein
          </Button>
        </div>

        {isLoadingBlocks ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {textBlocks && textBlocks.length > 0 ? (
              textBlocks.map((block) => (
                <Card key={block.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{block.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {CATEGORY_LABELS[block.category]}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(block)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(block.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {block.content}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Noch keine Textbausteine vorhanden. Erstellen Sie Ihren ersten Textbaustein.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBlock ? "Textbaustein bearbeiten" : "Neuer Textbaustein"}
              </DialogTitle>
              <DialogDescription>
                Erstellen Sie einen wiederverwendbaren Textbaustein für die Themenfelder
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titel</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Sturzrisiko - Standard"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Inhalt</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Geben Sie hier den Text ein, der in die Themenfelder eingefügt werden soll..."
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
