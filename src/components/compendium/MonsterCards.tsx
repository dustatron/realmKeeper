import { CompendiumMonster } from "~/domain/entities/Compendium";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Link } from "@tanstack/react-router";
import { Badge } from "../ui/badge";

export function MonsterCard({ monster }: { monster: CompendiumMonster }) {
  const isCustom = monster.systemData.system === "custom";
  return (
    <Link
      to={
        isCustom
          ? "/realms/compendium/custom/$entryId"
          : "/realms/compendium/monsters/$monsterId"
      }
      params={isCustom ? { entryId: monster.id } : { monsterId: monster.id }}
      className="block"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="truncate">{monster.name}</span>
            {isCustom ? (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 text-xs shrink-0 ml-2">
                Custom
              </Badge>
            ) : (
              <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 text-xs shrink-0 ml-2">
                {monster.systemData.system}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {monster.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
