import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";

export type EquipmentFilters = {
  types: string[];
  properties: string[];
  attackTypes: string[];
};

export const DEFAULT_EQUIPMENT_FILTERS: EquipmentFilters = {
  types: [],
  properties: [],
  attackTypes: [],
};

const SD_TYPES = ["weapon", "armor", "gear"];
const CAIRN_TYPES = ["weapon", "armor", "gear", "transport"];

const SD_PROPERTIES = [
  "Versatile",
  "Finesse",
  "2 handed",
  "Thrown",
  "loading",
  "Occupies one hand",
];
const CAIRN_PROPERTIES = ["bulky"];

const ATTACK_TYPES = [
  { value: "Melee", label: "Melee" },
  { value: "Range", label: "Range" },
  { value: "M/R", label: "Melee/Range" },
];

function countActive(f: EquipmentFilters): number {
  return (
    (f.types.length ? 1 : 0) +
    (f.properties.length ? 1 : 0) +
    (f.attackTypes.length ? 1 : 0)
  );
}

function ChipToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors capitalize ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
      }`}
    >
      {label}
    </button>
  );
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export function EquipmentAdvancedFilters({
  filters,
  onChange,
  open,
  onToggleOpen,
  systemId,
}: {
  filters: EquipmentFilters;
  onChange: (f: EquipmentFilters) => void;
  open: boolean;
  onToggleOpen: () => void;
  systemId: string;
}) {
  const activeCount = countActive(filters);
  const isShadowdark = systemId === "system-shadowdark";
  const types = isShadowdark ? SD_TYPES : CAIRN_TYPES;
  const properties = isShadowdark ? SD_PROPERTIES : CAIRN_PROPERTIES;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={open || activeCount > 0 ? "default" : "outline"}
          size="sm"
          onClick={onToggleOpen}
          className="gap-1.5"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 text-xs h-4 px-1">
              {activeCount}
            </Badge>
          )}
        </Button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_EQUIPMENT_FILTERS)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Type
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => (
                <ChipToggle
                  key={t}
                  label={t}
                  active={filters.types.includes(t)}
                  onClick={() => onChange({ ...filters, types: toggle(filters.types, t) })}
                />
              ))}
            </div>
          </div>

          {/* Attack Type — Shadowdark only */}
          {isShadowdark && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Attack Type
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {ATTACK_TYPES.map((a) => (
                  <ChipToggle
                    key={a.value}
                    label={a.label}
                    active={filters.attackTypes.includes(a.value)}
                    onClick={() =>
                      onChange({ ...filters, attackTypes: toggle(filters.attackTypes, a.value) })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Properties */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Properties
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {properties.map((p) => (
                <ChipToggle
                  key={p}
                  label={p}
                  active={filters.properties.includes(p)}
                  onClick={() =>
                    onChange({ ...filters, properties: toggle(filters.properties, p) })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function applyEquipmentAdvancedFilters<
  T extends {
    systemData:
      | {
          system: "shadowdark";
          data: { itemType: string; properties: string[]; attackType: string | null };
        }
      | { system: "cairn"; data: { category: string; properties: string[] } }
      | { system: string; data: unknown };
  },
>(items: T[], filters: EquipmentFilters): T[] {
  return items.filter((item) => {
    const sd = item.systemData;

    if (sd.system === "shadowdark") {
      const data = sd.data as {
        itemType: string;
        properties: string[];
        attackType: string | null;
      };
      if (filters.types.length > 0 && !filters.types.includes(data.itemType)) return false;
      if (
        filters.attackTypes.length > 0 &&
        !filters.attackTypes.includes(data.attackType ?? "")
      )
        return false;
      if (
        filters.properties.length > 0 &&
        !filters.properties.some((p) => data.properties.includes(p))
      )
        return false;
    } else if (sd.system === "cairn") {
      const data = sd.data as { category: string; properties: string[] };
      if (filters.types.length > 0 && !filters.types.includes(data.category)) return false;
      if (
        filters.properties.length > 0 &&
        !filters.properties.some((p) => data.properties.includes(p))
      )
        return false;
    }

    return true;
  });
}
