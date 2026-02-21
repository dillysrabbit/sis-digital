import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2 } from "lucide-react";

interface TextBlockButtonProps {
  category: string;
  onSelect: (content: string) => void;
}

export function TextBlockButton({ category, onSelect }: TextBlockButtonProps) {
  const { data: textBlocks, isLoading } = trpc.textBlocks.byCategory.useQuery({ category });

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!textBlocks || textBlocks.length === 0) {
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
        {textBlocks.map((block) => (
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
