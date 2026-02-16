import type { DayLogEntry } from "~/ui/hooks/useDayLog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCheck,
} from "lucide-react";
import { DayLogRow } from "./DayLogRow";

interface DayLogTableProps {
  entries: DayLogEntry[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onMarkDayComplete: (dayKey: number) => void;
  onMarkWeekComplete: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  worldId: string;
}

export function DayLogTable({
  entries,
  onPrev,
  onNext,
  onToday,
  onMarkDayComplete,
  onMarkWeekComplete,
  canGoPrev,
  canGoNext,
  worldId,
}: DayLogTableProps) {
  return (
    <div className="space-y-0">
      {/* Pagination controls */}
      <div className="flex items-center justify-between px-2 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onPrev}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onToday}
          >
            <CalendarDays className="size-3 mr-1" />
            Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onMarkWeekComplete}
          >
            <CheckCheck className="size-3 mr-1" />
            Mark Week
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <tr className="border-b">
            <TableHead className="w-8">x</TableHead>
            <TableHead className="w-3">Day</TableHead>
            <TableHead className="w-3">Weather</TableHead>
            <TableHead className="w-20">Faction</TableHead>
            <TableHead className="w-20">Events</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-28">Season</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {entries.map((entry, idx) => {
            const prevEntry = entries[idx - 1];
            const showSeasonDivider =
              !prevEntry ||
              prevEntry.season !== entry.season ||
              prevEntry.year !== entry.year;

            return (
              <DayLogRow
                key={entry.dayKey}
                entry={entry}
                worldId={worldId}
                showSeasonDivider={showSeasonDivider}
                onMarkComplete={onMarkDayComplete}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
