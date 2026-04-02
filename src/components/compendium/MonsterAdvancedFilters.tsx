import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export type MonsterFilters = {
  levelMin: number | "";
  levelMax: number | "";
  alignments: string[];
  movements: string[];
};

export const DEFAULT_MONSTER_FILTERS: MonsterFilters = {
  levelMin: "",
  levelMax: "",
  alignments: [],
  movements: [],
};

const ALIGNMENTS = [
  { value: "L", label: "Lawful" },
  { value: "N", label: "Neutral" },
  { value: "C", label: "Chaotic" },
];

const MOVEMENT_KEYWORDS = [
  { value: "near", label: "Near" },
  { value: "close", label: "Close" },
  { value: "double", label: "Double" },
  { value: "far", label: "Far" },
  { value: "fly", label: "Fly" },
  { value: "swim", label: "Swim" },
  { value: "burrow", label: "Burrow" },
  { value: "climb", label: "Climb" },
  { value: "teleport", label: "Teleport" },
  { value: "none", label: "None" },
];

function countActive(f: MonsterFilters): number {
  let n = 0;
  if (f.levelMin !== "") n++;
  if (f.levelMax !== "") n++;
  if (f.alignments.length) n++;
  if (f.movements.length) n++;
  return n;
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
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
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

export function MonsterAdvancedFilters({
  filters,
  onChange,
  open,
  onToggleOpen,
}: {
  filters: MonsterFilters;
  onChange: (f: MonsterFilters) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const activeCount = countActive(filters);

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
            onClick={() => onChange(DEFAULT_MONSTER_FILTERS)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-4">
          {/* Level range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Level
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={30}
                placeholder="Min"
                value={filters.levelMin}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    levelMin: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-7 w-20 text-sm"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="number"
                min={0}
                max={30}
                placeholder="Max"
                value={filters.levelMax}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    levelMax: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-7 w-20 text-sm"
              />
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Alignment
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {ALIGNMENTS.map((a) => (
                <ChipToggle
                  key={a.value}
                  label={a.label}
                  active={filters.alignments.includes(a.value)}
                  onClick={() =>
                    onChange({ ...filters, alignments: toggle(filters.alignments, a.value) })
                  }
                />
              ))}
            </div>
          </div>

          {/* Movement */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Movement
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {MOVEMENT_KEYWORDS.map((mv) => (
                <ChipToggle
                  key={mv.value}
                  label={mv.label}
                  active={filters.movements.includes(mv.value)}
                  onClick={() =>
                    onChange({ ...filters, movements: toggle(filters.movements, mv.value) })
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

export function applyMonsterAdvancedFilters<
  T extends {
    systemData:
      | { system: "shadowdark"; data: { level: number; alignment: string; movement: string } }
      | { system: string; data: unknown };
  },
>(items: T[], filters: MonsterFilters): T[] {
  return items.filter((m) => {
    if (m.systemData.system !== "shadowdark") return true;
    const sd = m.systemData.data as { level: number; alignment: string; movement: string };

    if (filters.levelMin !== "" && sd.level < filters.levelMin) return false;
    if (filters.levelMax !== "" && sd.level > filters.levelMax) return false;

    if (filters.alignments.length > 0 && !filters.alignments.includes(sd.alignment)) return false;

    if (filters.movements.length > 0) {
      const mv = sd.movement.toLowerCase();
      const matches = filters.movements.some((kw) => mv.includes(kw));
      if (!matches) return false;
    }

    return true;
  });
}
