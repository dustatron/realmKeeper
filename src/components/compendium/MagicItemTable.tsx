import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CompendiumMagicItem } from "~/domain/entities/Compendium";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Star, ChevronUp, ChevronDown, ChevronsUpDown, EyeOff, Eye } from "lucide-react";
import { cn } from "~/lib/utils";
import { usePagination } from "./usePagination";
import { PaginationControls } from "./PaginationControls";

type SortKey = "name" | "source" | "details";
type SortDir = "asc" | "desc";

function getSortValue(item: CompendiumMagicItem, key: SortKey): string {
  if (key === "name") return item.name.toLowerCase();
  if (key === "source") return item.systemData.system;
  if (key === "details") {
    const sd = item.systemData;
    if (sd.system === "cairn") return sd.data.charges ?? "";
    if (sd.system === "custom") return sd.data.rarity.toLowerCase();
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

export function MagicItemTable({
  items,
  starredIds,
  onToggleStar,
  hiddenIds,
  onToggleHide,
}: {
  items: CompendiumMagicItem[];
  starredIds: string[];
  onToggleStar?: (id: string) => void;
  hiddenIds?: Set<string>;
  onToggleHide?: (id: string) => void;
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
      [...items].sort((a, b) => {
        const av = getSortValue(a, sortKey);
        const bv = getSortValue(b, sortKey);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      }),
    [items, sortKey, sortDir],
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
          {th("Source", "source", "hidden sm:table-cell")}
          {th("Details", "details", "hidden sm:table-cell w-full")}
          {onToggleStar && <TableHead className="w-8" />}
          {onToggleHide && <TableHead className="w-8" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagination.paged.map((item) => {
          const isCustom = item.systemData.system === "custom";
          const isHidden = hiddenIds?.has(item.id) ?? false;
          const sd = item.systemData;

          let details = "—";
          if (sd.system === "cairn" && sd.data.charges) {
            details = `${sd.data.charges} charges`;
          } else if (sd.system === "cairn" && sd.data.recharge) {
            details = `Recharge: ${sd.data.recharge}`;
          } else if (sd.system === "custom") {
            const parts = [];
            if (sd.data.rarity) parts.push(sd.data.rarity);
            if (sd.data.itemType) parts.push(sd.data.itemType);
            if (sd.data.attunement) parts.push("Attunement");
            details = parts.join(" · ") || "—";
          }

          return (
            <TableRow key={item.id} className={cn(isHidden && "opacity-50")}>
              <TableCell className="font-medium">
                <Link
                  to={
                    isCustom
                      ? "/realms/compendium/custom/$entryId"
                      : "/realms/compendium/magic-items/$itemId"
                  }
                  params={
                    isCustom ? { entryId: item.id } : { itemId: item.id }
                  }
                  className={cn("hover:underline", isHidden && "line-through")}
                >
                  {item.name}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge
                  variant="outline"
                  className={`text-xs ${isCustom ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"}`}
                >
                  {isCustom ? "Custom" : sd.system}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-0 truncate">
                {details}
              </TableCell>
              {onToggleStar && (
                <TableCell className="text-center">
                  <button
                    onClick={() => onToggleStar(item.id)}
                    className="p-1 rounded hover:bg-muted"
                    title={starredIds.includes(item.id) ? "Unstar" : "Star"}
                  >
                    <Star
                      className={`size-3.5 ${starredIds.includes(item.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  </button>
                </TableCell>
              )}
              {onToggleHide && !isCustom && (
                <TableCell className="text-center">
                  <button onClick={() => onToggleHide(item.id)} className="p-1 rounded hover:bg-muted" title={isHidden ? "Restore" : "Hide"}>
                    {isHidden ? <Eye className="size-3.5 text-muted-foreground" /> : <EyeOff className="size-3.5 text-muted-foreground opacity-40 hover:opacity-100 transition-opacity" />}
                  </button>
                </TableCell>
              )}
              {onToggleHide && isCustom && <TableCell />}
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
