import { resourcesToBiomes } from "@domain/data/worldgen/resources.catalog";
import { biomeLabel } from "@domain/data/worldgen/biomes";
import { Badge } from "~/components/ui/badge";

interface BiomePreviewProps {
  resources: string[];
}

/**
 * Live, presentational preview of the biome distribution implied by the chosen
 * resources. Mirrors what generation will build (shared `resourcesToBiomes`).
 */
export function BiomePreview({ resources }: BiomePreviewProps) {
  const counts = resourcesToBiomes(resources);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">No biomes yet</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([biome, count]) => (
        <Badge key={biome} variant="secondary" className="text-xs">
          {biomeLabel(biome)} ×{count}
        </Badge>
      ))}
    </div>
  );
}
