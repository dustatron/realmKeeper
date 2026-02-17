import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { CompendiumMagicItem } from "~/domain/entities/Compendium";

export function MagicItemCard({ item }: { item: CompendiumMagicItem }) {
  const sd = item.systemData;
  const isCustom = sd.system === "custom";
  return (
    <Link
      to={
        isCustom
          ? "/realms/compendium/custom/$entryId"
          : "/realms/compendium/magic-items/$itemId"
      }
      params={isCustom ? { entryId: item.id } : { itemId: item.id }}
      className="block"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="truncate">{item.name}</span>
            {isCustom ? (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 text-xs shrink-0">
                Custom
              </Badge>
            ) : (
              <>
                {sd.system === "cairn" && sd.data.charges && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs shrink-0">
                    {sd.data.charges} charges
                  </Badge>
                )}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
