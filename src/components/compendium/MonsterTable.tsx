import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CompendiumMonster } from "~/domain/entities/Compendium";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Star, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { usePagination } from "./usePagination";
import { PaginationControls } from "./PaginationControls";

type SortKey = "name" | "level" | "ac" | "hp" | "attacks" | "alignment";
type SortDir = "asc" | "desc";

function getSortValue(monster: CompendiumMonster, key: SortKey): string | number {
  if (key === "name") return monster.name.toLowerCase();
  const sd = monster.systemData;
  if (key === "level") {
    if (sd.system === "shadowdark") return sd.data.level;
    return -Infinity;
  }
  if (key === "attacks") {
    if (sd.system === "shadowdark") return sd.data.attacks.toLowerCase();
    return "";
  }
  if (key === "alignment") {
    if (sd.system === "shadowdark") return sd.data.alignment.toLowerCase();
    return "";
  }
  if (sd.system !== "shadowdark") return -Infinity;
  if (key === "ac") return sd.data.armorClass;
  if (key === "hp") return sd.data.hitPoints;
  return -Infinity;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="size-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="size-3" />
  ) : (
    <ChevronDown className="size-3" />
  );
}

export function MonsterTable({
  monsters,
  starredIds,
  onToggleStar,
}: {
  monsters: CompendiumMonster[];
  starredIds: string[];
  onToggleStar?: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(
    () =>
      [...monsters].sort((a, b) => {
        const av = getSortValue(a, sortKey);
        const bv = getSortValue(b, sortKey);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      }),
    [monsters, sortKey, sortDir],
  );

  const PAGE_SIZE = 25;
  const pagination = usePagination(sorted, PAGE_SIZE);

  const th = (label: string, key: SortKey, className?: string) => (
    <TableHead className={className}>
      <button
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon active={sortKey === key} dir={sortDir} />
      </button>
    </TableHead>
  );

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          {th("Name", "name")}
          <TableHead className="hidden sm:table-cell">Source</TableHead>
          {th("Lvl", "level", "hidden sm:table-cell text-right")}
          {th("AC", "ac", "hidden sm:table-cell text-right")}
          {th("HP", "hp", "text-right")}
          {th("Attacks", "attacks", "hidden sm:table-cell")}
          {th("Align", "alignment", "hidden sm:table-cell")}
          {onToggleStar && <TableHead className="w-8" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagination.paged.map((monster) => {
          const isCustom = monster.systemData.system === "custom";
          const sd = monster.systemData;
          let level = "—";
          let ac = "—";
          let hp = "—";
          let attacks = "—";
          let alignment = "—";
          if (sd.system === "shadowdark") {
            level = String(sd.data.level);
            ac = String(sd.data.armorClass);
            hp = String(sd.data.hitPoints);
            attacks = sd.data.attacks || "—";
            alignment = sd.data.alignment || "—";
          } else if (sd.system === "cairn") {
            hp = sd.data.stats || "—";
          }

          return (
            <TableRow key={monster.id}>
              <TableCell className="font-medium">
                <Link
                  to={
                    isCustom
                      ? "/realms/compendium/custom/$entryId"
                      : "/realms/compendium/monsters/$monsterId"
                  }
                  params={
                    isCustom
                      ? { entryId: monster.id }
                      : { monsterId: monster.id }
                  }
                  className="hover:underline"
                >
                  {monster.name}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge
                  variant="outline"
                  className={`text-xs ${isCustom ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" : "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"}`}
                >
                  {isCustom ? "Custom" : sd.system}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right text-sm tabular-nums">
                {level}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right text-sm tabular-nums">
                {ac}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">{hp}</TableCell>
              <TableCell className="hidden sm:table-cell text-sm">{attacks}</TableCell>
              <TableCell className="hidden sm:table-cell text-sm">{alignment}</TableCell>
              {onToggleStar && (
                <TableCell className="text-center">
                  <button
                    onClick={() => onToggleStar(monster.id)}
                    className="p-1 rounded hover:bg-muted"
                    title={starredIds.includes(monster.id) ? "Unstar" : "Star"}
                  >
                    <Star
                      className={`size-3.5 ${starredIds.includes(monster.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  </button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    <PaginationControls
      page={pagination.page}
      totalPages={pagination.totalPages}
      totalItems={pagination.totalItems}
      hasPrev={pagination.hasPrev}
      hasNext={pagination.hasNext}
      onPrev={pagination.prev}
      onNext={pagination.next}
      pageSize={PAGE_SIZE}
    />
    </>
  );
}
