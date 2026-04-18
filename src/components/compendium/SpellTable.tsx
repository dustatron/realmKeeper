import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CompendiumSpell } from "~/domain/entities/Compendium";
import { Badge } from "../ui/badge";
import { usePagination } from "./usePagination";
import { PaginationControls } from "./PaginationControls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Star, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortKey = "name" | "tier" | "classes" | "range" | "duration";
type SortDir = "asc" | "desc";

function getSortValue(spell: CompendiumSpell, key: SortKey): string | number {
  if (key === "name") return spell.name.toLowerCase();
  const sd = spell.systemData;
  if (key === "tier") {
    if (sd.system === "shadowdark") return sd.data.tier ?? "";
    if (sd.system === "cairn") return sd.data.number ?? "";
    if (sd.system === "custom") return sd.data.level ?? "";
    return "";
  }
  if (key === "classes") {
    if (sd.system === "shadowdark") return (sd.data.classes[0] ?? "").toLowerCase();
    if (sd.system === "custom") return (sd.data.classes[0] ?? "").toLowerCase();
    return "";
  }
  if (key === "range") {
    if (sd.system === "shadowdark") return sd.data.range.toLowerCase();
    if (sd.system === "custom") return (sd.data.range ?? "").toLowerCase();
    return "";
  }
  if (key === "duration") {
    if (sd.system === "shadowdark") return sd.data.duration.toLowerCase();
    if (sd.system === "custom") return (sd.data.duration ?? "").toLowerCase();
    return "";
  }
  return "";
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="size-3 opacity-30" />;
  return dir === "asc" ? (
    <ChevronUp className="size-3" />
  ) : (
    <ChevronDown className="size-3" />
  );
}

export function SpellTable({
  spells,
  starredIds,
  onToggleStar,
  systemId = "",
}: {
  spells: CompendiumSpell[];
  starredIds: string[];
  onToggleStar?: (id: string) => void;
  systemId?: string;
}) {
  const isCairn = systemId === "system-cairn-2e";
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
      [...spells].sort((a, b) => {
        const av = getSortValue(a, sortKey);
        const bv = getSortValue(b, sortKey);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      }),
    [spells, sortKey, sortDir],
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
          {!isCairn && th("Tier / #", "tier")}
          {isCairn && <TableHead className="w-full">Description</TableHead>}
          {!isCairn && th("Classes", "classes", "hidden sm:table-cell")}
          {!isCairn && th("Range", "range", "hidden sm:table-cell")}
          {!isCairn && th("Duration", "duration", "hidden sm:table-cell")}
          {onToggleStar && <TableHead className="w-8" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagination.paged.map((spell) => {
          const isCustom = spell.systemData.system === "custom";
          const sd = spell.systemData;

          let tier = "—";
          let classes: string[] = [];
          let range = "—";
          let duration = "—";

          if (sd.system === "shadowdark") {
            tier = sd.data.tier;
            classes = sd.data.classes;
            range = sd.data.range;
            duration = sd.data.duration;
          } else if (sd.system === "cairn") {
            tier = `#${sd.data.number}`;
          } else if (sd.system === "custom") {
            tier = sd.data.level || "—";
            classes = sd.data.classes;
            range = sd.data.range || "—";
            duration = sd.data.duration || "—";
          }

          return (
            <TableRow key={spell.id}>
              <TableCell className="font-medium">
                <Link
                  to={
                    isCustom
                      ? "/realms/compendium/custom/$entryId"
                      : "/realms/compendium/spells/$spellId"
                  }
                  params={
                    isCustom ? { entryId: spell.id } : { spellId: spell.id }
                  }
                  className="hover:underline"
                >
                  {spell.name}
                </Link>
              </TableCell>
              {!isCairn && (
                <TableCell>
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs">
                    {tier}
                  </Badge>
                </TableCell>
              )}
              {isCairn && (
                <TableCell className="text-sm text-muted-foreground max-w-0 truncate">
                  {spell.description || "—"}
                </TableCell>
              )}
              {!isCairn && (
                <TableCell className="hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {classes.length > 0
                      ? classes.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {c}
                          </Badge>
                        ))
                      : "—"}
                  </div>
                </TableCell>
              )}
              {!isCairn && <TableCell className="hidden sm:table-cell text-sm">{range}</TableCell>}
              {!isCairn && <TableCell className="hidden sm:table-cell text-sm">{duration}</TableCell>}
              {onToggleStar && (
                <TableCell className="text-center">
                  <button
                    onClick={() => onToggleStar(spell.id)}
                    className="p-1 rounded hover:bg-muted"
                    title={starredIds.includes(spell.id) ? "Unstar" : "Star"}
                  >
                    <Star
                      className={`size-3.5 ${starredIds.includes(spell.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
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
