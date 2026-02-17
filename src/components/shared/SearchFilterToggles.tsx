import type { LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export interface FilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface MultiSelectProps {
  type: "multiple";
  value: string[];
  onChange: (value: string[]) => void;
}

interface SingleSelectProps {
  type: "single";
  value: string;
  onChange: (value: string) => void;
}

type SearchFilterTogglesProps = {
  options: FilterOption[];
} & (MultiSelectProps | SingleSelectProps);

export function SearchFilterToggles(props: SearchFilterTogglesProps) {
  const { options, type } = props;

  if (type === "multiple") {
    return (
      <ToggleGroup
        type="multiple"
        value={props.value}
        onValueChange={props.onChange}
        size="sm"
        className="shrink-0 flex-wrap"
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="text-xs px-2.5 gap-1"
          >
            {opt.icon && <opt.icon className="size-3" />}
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }

  return (
    <ToggleGroup
      type="single"
      value={props.value}
      onValueChange={(v) => v && props.onChange(v)}
      size="sm"
      className="shrink-0 flex-wrap"
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          className="text-xs px-2.5 gap-1"
        >
          {opt.icon && <opt.icon className="size-3" />}
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
