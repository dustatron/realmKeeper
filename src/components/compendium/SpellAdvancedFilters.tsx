import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";

export type SpellFilters = {
  tiers: string[];
  classes: string[];
  ranges: string[];
  durations: string[];
};

export const DEFAULT_SPELL_FILTERS: SpellFilters = {
  tiers: [],
  classes: [],
  ranges: [],
  durations: [],
};

const TIERS = ["1", "2", "3", "4", "5"];

const CLASSES = [
  { value: "priest", label: "Priest" },
  { value: "wizard", label: "Wizard" },
  { value: "witch", label: "Witch" },
];

const RANGES = ["Close", "Near", "Far", "Self", "Unlimited"];

const DURATIONS = [
  "Instant",
  "Focus",
  "5 rounds",
  "10 rounds",
  "1 hour real time",
  "1 day",
  "1d8 days",
];

function countActive(f: SpellFilters): number {
  return (
    (f.tiers.length ? 1 : 0) +
    (f.classes.length ? 1 : 0) +
    (f.ranges.length ? 1 : 0) +
    (f.durations.length ? 1 : 0)
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

export function SpellAdvancedFilters({
  filters,
  onChange,
  open,
  onToggleOpen,
}: {
  filters: SpellFilters;
  onChange: (f: SpellFilters) => void;
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
            onClick={() => onChange(DEFAULT_SPELL_FILTERS)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-4">
          {/* Tier */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tier
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map((t) => (
                <ChipToggle
                  key={t}
                  label={`Tier ${t}`}
                  active={filters.tiers.includes(t)}
                  onClick={() => onChange({ ...filters, tiers: toggle(filters.tiers, t) })}
                />
              ))}
            </div>
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Class
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {CLASSES.map((c) => (
                <ChipToggle
                  key={c.value}
                  label={c.label}
                  active={filters.classes.includes(c.value)}
                  onClick={() =>
                    onChange({ ...filters, classes: toggle(filters.classes, c.value) })
                  }
                />
              ))}
            </div>
          </div>

          {/* Range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Range
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {RANGES.map((r) => (
                <ChipToggle
                  key={r}
                  label={r}
                  active={filters.ranges.includes(r)}
                  onClick={() => onChange({ ...filters, ranges: toggle(filters.ranges, r) })}
                />
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Duration
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <ChipToggle
                  key={d}
                  label={d}
                  active={filters.durations.includes(d)}
                  onClick={() =>
                    onChange({ ...filters, durations: toggle(filters.durations, d) })
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

export function applySpellAdvancedFilters<
  T extends {
    systemData:
      | {
          system: "shadowdark";
          data: { tier: string; classes: string[]; range: string; duration: string };
        }
      | { system: string; data: unknown };
  },
>(items: T[], filters: SpellFilters): T[] {
  return items.filter((s) => {
    if (s.systemData.system !== "shadowdark") return true;
    const sd = s.systemData.data as {
      tier: string;
      classes: string[];
      range: string;
      duration: string;
    };

    if (filters.tiers.length > 0 && !filters.tiers.includes(sd.tier)) return false;
    if (
      filters.classes.length > 0 &&
      !filters.classes.some((c) => sd.classes.includes(c))
    )
      return false;
    if (filters.ranges.length > 0 && !filters.ranges.includes(sd.range)) return false;
    if (filters.durations.length > 0 && !filters.durations.includes(sd.duration)) return false;

    return true;
  });
}
