import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TextBlockFABProps {
  onSelect: (content: string) => void;
}

const categoryLabels: Record<string, string> = {
  mobilitaet: "Mobilität",
  ernaehrung: "Ernährung",
  koerperpflege: "Körperpflege",
  ausscheidung: "Ausscheidung",
  kommunikation: "Kommunikation",
  soziales: "Soziales",
  schmerz: "Schmerz",
  medikation: "Medikation",
  wundversorgung: "Wundversorgung",
  allgemein: "Allgemein",
};

const categoryColors: Record<string, string> = {
  mobilitaet: "bg-blue-100 text-blue-800 border-blue-200",
  ernaehrung: "bg-green-100 text-green-800 border-green-200",
  koerperpflege: "bg-purple-100 text-purple-800 border-purple-200",
  ausscheidung: "bg-yellow-100 text-yellow-800 border-yellow-200",
  kommunikation: "bg-pink-100 text-pink-800 border-pink-200",
  soziales: "bg-orange-100 text-orange-800 border-orange-200",
  schmerz: "bg-red-100 text-red-800 border-red-200",
  medikation: "bg-indigo-100 text-indigo-800 border-indigo-200",
  wundversorgung: "bg-teal-100 text-teal-800 border-teal-200",
  allgemein: "bg-gray-100 text-gray-800 border-gray-200",
};

export function TextBlockFAB({ onSelect }: TextBlockFABProps) {
  const [open, setOpen] = useState(false);
  const { data: textBlocks, isLoading } = trpc.textBlocks.list.useQuery();

  // Gruppiere Textbausteine nach Kategorie
  const groupedBlocks = textBlocks?.reduce((acc, block) => {
    const category = block.category || "allgemein";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(block);
    return acc;
  }, {} as Record<string, typeof textBlocks>);

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white z-10"
          title="Textbausteine einfügen"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-[90vw] sm:w-96 p-0"
        sideOffset={8}
      >
        <div className="p-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white">
          <h3 className="font-semibold text-lg">Textbausteine</h3>
          <p className="text-sm text-white/80">Klicken zum Einfügen</p>
        </div>
        <ScrollArea className="h-[60vh] sm:h-96">
          <div className="p-4 space-y-4">
            {!groupedBlocks || Object.keys(groupedBlocks).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Keine Textbausteine verfügbar
              </p>
            ) : (
              Object.entries(groupedBlocks).map(([category, blocks]) => (
                <div key={category} className="space-y-2">
                  <Badge
                    variant="outline"
                    className={`${categoryColors[category] || categoryColors.allgemein} font-medium`}
                  >
                    {categoryLabels[category] || category}
                  </Badge>
                  <div className="space-y-1">
                    {blocks.map((block) => (
                      <button
                        key={block.id}
                        onClick={() => handleSelect(block.content)}
                        className="w-full text-left p-3 rounded-md border hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                      >
                        <div className="font-medium text-sm mb-1">
                          {block.title}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {block.content}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
