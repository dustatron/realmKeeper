import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  pageSize,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageSize: number;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t pt-2 mt-1">
      <span className="text-xs text-muted-foreground">
        {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={!hasPrev}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs tabular-nums px-1">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
