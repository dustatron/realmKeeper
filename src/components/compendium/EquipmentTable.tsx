import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CompendiumEquipment } from "~/domain/entities/Compendium";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown, EyeOff, Eye } from "lucide-react";
import { cn } from "~/lib/utils";
import { usePagination } from "./usePagination";
import { PaginationControls } from "./PaginationControls";

type SortKey = "name" | "category" | "cost" | "damage" | "armor" | "slots";
type SortDir = "asc" | "desc";

function getCostNumber(item: CompendiumEquipment): number {
  const sd = item.systemData;
  if (sd.system === "cairn") return sd.data.cost ?? 0;
  if (sd.system === "shadowdark") return sd.data.cost.amount ?? 0;
  return 0;
}

// Parse damage like "1d6", "2d8+1" → sort by die size (d-value)
function parseDamageSortValue(dmg: string | null | undefined): number {
  if (!dmg) return -1;
  const m = dmg.match(/d(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function getSortValue(
  item: CompendiumEquipment,
  key: SortKey,
): string | number {
  if (key === "name") return item.name.toLowerCase();
  if (key === "cost") return getCostNumber(item);
  const sd = item.systemData;
  if (key === "category") {
    if (sd.system === "cairn") return sd.data.category.toLowerCase();
    if (sd.system === "shadowdark") return sd.data.itemType.toLowerCase();
    return sd.data.category?.toLowerCase() ?? "";
  }
  if (key === "damage") return parseDamageSortValue(sd.data.damage);
  if (key === "armor") {
    if (sd.system === "cairn") return sd.data.armor ?? -1;
    return -1;
  }
  if (key === "slots") {
    if (sd.system === "cairn") return sd.data.slots ?? 0;
    if (sd.system === "shadowdark") return sd.data.slot ?? 0;
    return 0;
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

export function EquipmentTable({
  items,
  hiddenIds,
  onToggleHide,
}: {
  items: CompendiumEquipment[];
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

  const showArmor = items.some(
    (i) => i.systemData.system === "cairn" && i.systemData.data.armor != null,
  );

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
          {th("Category", "category")}
          {th("Cost", "cost", "hidden sm:table-cell text-left")}
          {th("Damage", "damage", "hidden sm:table-cell text-left")}
          {showArmor && th("Armor", "armor", "hidden sm:table-cell text-left")}
          {th("Slots", "slots", "hidden sm:table-cell text-left")}
          <TableHead className="hidden md:table-cell">Properties</TableHead>
          {onToggleHide && <TableHead className="w-8" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagination.paged.map((item) => {
          const isCustom = item.systemData.system === "custom";
          const isHidden = hiddenIds?.has(item.id) ?? false;
          const sd = item.systemData;
          let cost: string;
          let category: string;
          let armor = "—";
          let slots = "—";
          if (sd.system === "cairn") {
            cost = sd.data.cost ? `${sd.data.cost} gp` : "—";
            category = sd.data.category;
            if (sd.data.armor != null) armor = String(sd.data.armor);
            if (sd.data.slots != null) slots = String(sd.data.slots);
          } else if (sd.system === "shadowdark") {
            cost = `${sd.data.cost.amount} ${sd.data.cost.currency}`;
            category = sd.data.itemType;
            if (sd.data.slot > 0) slots = String(sd.data.slot);
          } else {
            cost = sd.data.cost || "—";
            category = sd.data.category || "—";
          }
          const damage = sd.data.damage ?? "—";
          const properties = sd.data.properties;

          return (
            <TableRow key={item.id} className={cn(isHidden && "opacity-50")}>
              <TableCell className="font-medium">
                <Link
                  to={
                    isCustom
                      ? "/realms/compendium/custom/$entryId"
                      : "/realms/compendium/equipment/$equipmentId"
                  }
                  params={
                    isCustom
                      ? { entryId: item.id }
                      : { equipmentId: item.id }
                  }
                  className={cn("hover:underline", isHidden && "line-through")}
                >
                  {item.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {category}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-left text-sm tabular-nums">
                {cost}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-left text-sm tabular-nums">
                {damage}
              </TableCell>
              {showArmor && (
                <TableCell className="hidden sm:table-cell text-left text-sm tabular-nums">
                  {armor}
                </TableCell>
              )}
              <TableCell className="hidden sm:table-cell text-left text-sm tabular-nums">
                {slots}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {properties.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {properties.map((p) => (
                      <Badge
                        key={p}
                        className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
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
