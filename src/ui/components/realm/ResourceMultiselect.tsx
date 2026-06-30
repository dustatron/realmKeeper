import { X } from "lucide-react";
import {
  rawResourcesForPacks,
  type ResourcePack,
} from "@domain/data/worldgen/resources.catalog";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface ResourceMultiselectProps {
  value: string[];
  onChange: (next: string[]) => void;
  packs: ResourcePack[];
}

/**
 * Tag-like editor for the world's raw resources. Selected resources show as
 * removable chips; the "add" Select lists raw resources from the enabled packs
 * that aren't already chosen (cross-pack adds allowed by enabling more packs).
 */
export function ResourceMultiselect({
  value,
  onChange,
  packs,
}: ResourceMultiselectProps) {
  const selected = new Set(value);
  const available = rawResourcesForPacks(packs)
    .map((r) => r.name)
    .filter((name) => !selected.has(name))
    .sort((a, b) => a.localeCompare(b));

  const remove = (name: string) => onChange(value.filter((n) => n !== name));
  const add = (name: string) => {
    if (!selected.has(name)) onChange([...value, name]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            No resources selected
          </p>
        ) : (
          value.map((name) => (
            <Badge key={name} variant="outline" className="gap-1 pr-1 text-xs">
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                className="rounded-full p-0.5 hover:bg-accent hover:text-accent-foreground"
                aria-label={`Remove ${name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <Select
        value=""
        onValueChange={add}
        disabled={available.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Add a resource…" />
        </SelectTrigger>
        <SelectContent>
          {available.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
