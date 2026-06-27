import type { DayLogEntry } from "~/ui/hooks/useDayLog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
} from "~/components/ui/table";
import { DayLogRow } from "./DayLogRow";

interface DayLogTableProps {
  entries: DayLogEntry[];
  onMarkDayComplete: (dayKey: number) => void;
  worldId: string;
}

export function DayLogTable({
  entries,
  onMarkDayComplete,
  worldId,
}: DayLogTableProps) {
  return (
    <div className="space-y-0">
      <Table>
        <TableHeader>
          <tr className="border-b">
            <TableHead className="w-8">x</TableHead>
            <TableHead className="w-3">Day</TableHead>
            <TableHead className="w-3">Weather</TableHead>
            <TableHead className="w-3">Moon</TableHead>
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
