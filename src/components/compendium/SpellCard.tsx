import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { CompendiumSpell } from "~/domain/entities/Compendium";
import { Star } from "lucide-react";

export function SpellCard({
  spell,
  starred,
  onToggleStar,
}: {
  spell: CompendiumSpell;
  starred?: boolean;
  onToggleStar?: (id: string) => void;
}) {
  const sd = spell.systemData;
  const isCustom = sd.system === "custom";
  return (
    <div className="relative">
      {onToggleStar && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleStar(spell.id);
          }}
          className="absolute top-2 right-2 z-10 p-1 rounded-md hover:bg-muted"
          title={starred ? "Unstar" : "Star"}
        >
          <Star
            className={`size-4 ${starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      )}
      <Link
        to={
          isCustom
            ? "/realms/compendium/custom/$entryId"
            : "/realms/compendium/spells/$spellId"
        }
        params={isCustom ? { entryId: spell.id } : { spellId: spell.id }}
        className="block"
      >
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span className="truncate">{spell.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                {isCustom ? (
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 text-xs">
                    Custom
                  </Badge>
                ) : (
                  <>
                    {sd.system === "shadowdark" && (
                      <>
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs">
                          {sd.data.tier}
                        </Badge>
                        {sd.data.classes.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </>
                    )}
                    {sd.system === "cairn" && (
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs">
                        #{sd.data.number}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {spell.description}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
