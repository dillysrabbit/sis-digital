import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface TextBlockButtonProps {
  category?: string;
  onSelect: (content: string) => void;
}

export function TextBlockButton({ category, onSelect }: TextBlockButtonProps) {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const action = category ? "getTextBlocksByCategory" : "listTextBlocks";
    const url = category
      ? `/api/admin/settings?action=${action}&category=${encodeURIComponent(category)}`
      : `/api/admin/settings?action=${action}`;
    fetch(url, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setBlocks)
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <FileText className="w-4 h-4 mr-2" />
          Textbaustein
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Textbaustein einfügen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {blocks.map((block) => (
          <DropdownMenuItem
            key={block.id}
            onClick={() => onSelect(block.content)}
            className="cursor-pointer"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">{block.title}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {block.content}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
