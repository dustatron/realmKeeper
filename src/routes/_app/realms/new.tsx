import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "~/components/shared/PageHeader";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  ChevronDown,
  Gem,
  Settings,
  Skull,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  DEFAULT_DAYS_PER_SEASON,
  DEFAULT_WATCHES_PER_DAY,
  DEFAULT_MOON_CYCLE_LENGTH,
} from "@shared/constants";
import { useSystemConfigs } from "~/ui/hooks/useSystemConfigs";
import { useContainer } from "~/ui/hooks/useContainer";
import { useUIStore } from "~/ui/stores/uiStore";
import { executeCreateRealm } from "@application/use-cases/CreateRealm";
import { executeGenerateWorld } from "@application/use-cases/GenerateWorld";
import { newId } from "@shared/ulid";

export const RulesSystemIds = {
  cairn: "system-cairn-2e",
  shadowdark: "system-shadowdark",
} as const;

export type RulesSystemIdType =
  (typeof RulesSystemIds)[keyof typeof RulesSystemIds];

const DEFAULT_SYSTEM_ID = RulesSystemIds.cairn;

// Shadowdark runs on a 4-watch day; everything else uses the global default.
function defaultWatchesForSystem(systemId: string): number {
  return systemId === RulesSystemIds.shadowdark ? 4 : DEFAULT_WATCHES_PER_DAY;
}

export const Route = createFileRoute("/_app/realms/new")({
  component: NewRealmPage,
});

function NewRealmPage() {
  const navigate = useNavigate();
  const container = useContainer();
  const systemConfigs = useSystemConfigs();
  const setActiveRealmId = useUIStore((state) => state.setActiveRealmId);

  const [createName, setCreateName] = useState("");
  const [createSystem, setCreateSystem] = useState<string>(DEFAULT_SYSTEM_ID);
  const [createDesc, setCreateDesc] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [createWatchesPerDay, setCreateWatchesPerDay] = useState(
    DEFAULT_WATCHES_PER_DAY,
  );
  const [createDaysPerSeason, setCreateDaysPerSeason] = useState(
    DEFAULT_DAYS_PER_SEASON,
  );
  const [createDaysPerWeek, setCreateDaysPerWeek] = useState(7);
  const [createMoonCycleLength, setCreateMoonCycleLength] = useState(
    DEFAULT_MOON_CYCLE_LENGTH,
  );
  const FactionTiggerOptionValues = {
    day: "day",
    week: "week",
    manual: "manual",
  } as const;

  type FactionTriggersOptions =
    (typeof FactionTiggerOptionValues)[keyof typeof FactionTiggerOptionValues];

  const [createFactionTurnTrigger, setCreateFactionTurnTrigger] =
    useState<FactionTriggersOptions>(FactionTiggerOptionValues.week);
  const [watchesTouched, setWatchesTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [genEnabled, setGenEnabled] = useState(true);
  const [genSize, setGenSize] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [genSeed, setGenSeed] = useState("");
  const [genFactions, setGenFactions] = useState(4);
  const [genPoiDensity, setGenPoiDensity] = useState<
    "sparse" | "normal" | "dense"
  >("normal");
  const [genLoomingThreat, setGenLoomingThreat] = useState(true);
  const [genAutoTreasure, setGenAutoTreasure] = useState(true);
  const [genAutoMagicItems, setGenAutoMagicItems] = useState(true);
  const [genAutoMonsters, setGenAutoMonsters] = useState(true);

  const handleCreateRealm = async () => {
    if (!createName.trim() || !createSystem) return;

    setIsCreating(true);
    try {
      if (genEnabled) {
        const { realmId, mapId } = await executeGenerateWorld(
          {
            name: createName.trim(),
            systemId: createSystem,
            description: createDesc.trim(),
            seed: genSeed.trim() || newId(),
            size: genSize,
            watchesPerDay: createWatchesPerDay,
            daysPerSeason: createDaysPerSeason,
            daysPerWeek: createDaysPerWeek,
            moonCycleLength: createMoonCycleLength,
            factionTurnTrigger: createFactionTurnTrigger,
            poiDensity: genPoiDensity,
            factionCount: genFactions,
            loomingThreat: genLoomingThreat,
            autoTreasure: genAutoTreasure,
            autoMagicItems: genAutoMagicItems,
            autoMonsters: genAutoMonsters,
          },
          {
            realmRepo: container.realmRepo,
            regionRepo: container.regionRepo,
            factionRepo: container.factionRepo,
            realmNoteRepo: container.realmNoteRepo,
            poiRepo: container.poiRepo,
            npcRepo: container.npcRepo,
            pathRepo: container.pathRepo,
            factionPresenceRepo: container.factionPresenceRepo,
            poiEventRepo: container.poiEventRepo,
          },
        );
        setActiveRealmId(realmId);
        navigate({ to: "/realms/maps/$mapId", params: { mapId } });
        return;
      }

      const newRealm = await executeCreateRealm(
        {
          name: createName.trim(),
          systemId: createSystem,
          description: createDesc.trim(),
          watchesPerDay: createWatchesPerDay,
          daysPerSeason: createDaysPerSeason,
          daysPerWeek: createDaysPerWeek,
          moonCycleLength: createMoonCycleLength,
          factionTurnTrigger: createFactionTurnTrigger,
        },
        {
          realmRepo: container.realmRepo,
          factionRepo: container.factionRepo,
          realmNoteRepo: container.realmNoteRepo,
        },
      );

      setActiveRealmId(newRealm.id);
      navigate({ to: "/realms" });
    } catch (error) {
      console.error("Failed to create realm:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const calendarSettingsSection = (
    <Collapsible open={calendarOpen} onOpenChange={setCalendarOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-0 font-medium"
          disabled={isCreating}
        >
          <span className="flex items-center gap-2">
            <Settings className="size-4" />
            Calendar Settings
          </span>
          <ChevronDown
            className={`size-4 transition-transform ${calendarOpen ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="watches-per-day" className="text-xs">
              Watches per Day
            </Label>
            <Input
              id="watches-per-day"
              type="text"
              inputMode="numeric"
              min="1"
              max="12"
              value={createWatchesPerDay}
              onChange={(e) => {
                setWatchesTouched(true);
                setCreateWatchesPerDay(
                  parseInt(e.target.value) || DEFAULT_WATCHES_PER_DAY,
                );
              }}
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="days-per-season" className="text-xs">
              Days per Season
            </Label>
            <Input
              id="days-per-season"
              type="text"
              inputMode="numeric"
              min="1"
              max="365"
              value={createDaysPerSeason}
              onChange={(e) =>
                setCreateDaysPerSeason(
                  parseInt(e.target.value) || DEFAULT_DAYS_PER_SEASON,
                )
              }
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="days-per-week" className="text-xs">
              Days per Week
            </Label>
            <Input
              id="days-per-week"
              type="text"
              inputMode="numeric"
              min="1"
              max="30"
              value={createDaysPerWeek}
              onChange={(e) =>
                setCreateDaysPerWeek(parseInt(e.target.value) || 7)
              }
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="moon-cycle-length" className="text-xs">
              Moon Cycle (days)
            </Label>
            <Input
              id="moon-cycle-length"
              type="text"
              inputMode="numeric"
              min="1"
              max="99"
              value={createMoonCycleLength}
              onChange={(e) =>
                setCreateMoonCycleLength(
                  parseInt(e.target.value) || DEFAULT_MOON_CYCLE_LENGTH,
                )
              }
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="faction-turn-trigger" className="text-xs">
              Faction Turn Trigger
            </Label>
            <Select
              value={createFactionTurnTrigger}
              onValueChange={(v) =>
                setCreateFactionTurnTrigger(v as "day" | "week" | "manual")
              }
              disabled={isCreating}
            >
              <SelectTrigger id="faction-turn-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Every Day</SelectItem>
                <SelectItem value="week">Every Week</SelectItem>
                <SelectItem value="manual">Manual Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  const generationSettingsSection = (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="gen-toggle"
          className="flex items-center gap-2 font-medium"
        >
          <Wand2 className="size-4" />
          Procedurally generate world
        </Label>
        <Switch
          id="gen-toggle"
          checked={genEnabled}
          onCheckedChange={setGenEnabled}
          disabled={isCreating}
        />
      </div>
      {genEnabled && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Off creates a blank world. On generates a biome hex map sized to
            your choice — a starting canvas you can flesh out.
          </p>
          <div className="grid gap-1.5">
            <Label className="text-xs">World size</Label>
            <ToggleGroup
              type="single"
              value={genSize}
              onValueChange={(v) => v && setGenSize(v as typeof genSize)}
              className="justify-start"
              disabled={isCreating}
            >
              <ToggleGroupItem value="small">Small · 8×8</ToggleGroupItem>
              <ToggleGroupItem value="medium">Medium · 12×12</ToggleGroupItem>
              <ToggleGroupItem value="large">Large · 16×16</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gen-seed" className="text-xs">
              Seed (optional)
            </Label>
            <Input
              id="gen-seed"
              placeholder="Leave blank for a random world"
              value={genSeed}
              onChange={(e) => setGenSeed(e.target.value)}
              disabled={isCreating}
            />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium">Advanced</p>
            <p className="text-xs text-muted-foreground">
              Fine-tune what gets generated: how many factions vie for power,
              how densely the map is dotted with points of interest, and whether
              a looming threat hangs over the realm.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="gen-factions" className="text-xs">
                  Factions
                </Label>
                <Input
                  id="gen-factions"
                  type="text"
              inputMode="numeric"
                  min="0"
                  max="20"
                  value={genFactions}
                  onChange={(e) =>
                    setGenFactions(parseInt(e.target.value) || 0)
                  }
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gen-poi" className="text-xs">
                  POI density
                </Label>
                <Select
                  value={genPoiDensity}
                  onValueChange={(v) =>
                    setGenPoiDensity(v as typeof genPoiDensity)
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger id="gen-poi">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sparse">Sparse</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="dense">Dense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="gen-threat" className="text-xs">
                Looming threat
              </Label>
              <Switch
                id="gen-threat"
                checked={genLoomingThreat}
                onCheckedChange={setGenLoomingThreat}
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium">Realm content</p>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="gen-treasure"
                    className="flex items-center gap-2 text-xs"
                  >
                    <Gem className="size-3.5" />
                    Auto add treasure
                  </Label>
                  <Switch
                    id="gen-treasure"
                    checked={genAutoTreasure}
                    onCheckedChange={setGenAutoTreasure}
                    disabled={isCreating}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="gen-magic-items"
                    className="flex items-center gap-2 text-xs"
                  >
                    <Sparkles className="size-3.5" />
                    Sprinkle magic items
                  </Label>
                  <Switch
                    id="gen-magic-items"
                    checked={genAutoMagicItems}
                    onCheckedChange={setGenAutoMagicItems}
                    disabled={isCreating}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="gen-monsters"
                    className="flex items-center gap-2 text-xs"
                  >
                    <Skull className="size-3.5" />
                    Sprinkle monsters
                  </Label>
                  <Switch
                    id="gen-monsters"
                    checked={genAutoMonsters}
                    onCheckedChange={setGenAutoMonsters}
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Realm" />

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="realm-name">Name</Label>
            <Input
              id="realm-name"
              placeholder="Name your realm"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="realm-system">System</Label>
            <Select
              value={createSystem}
              onValueChange={(v) => {
                setCreateSystem(v);
                // Apply the system's default watch count unless the user has
                // already set one manually (Shadowdark → 4).
                if (!watchesTouched)
                  setCreateWatchesPerDay(defaultWatchesForSystem(v));
              }}
              disabled={isCreating}
            >
              <SelectTrigger id="realm-system" className="w-full">
                <SelectValue placeholder="Select a system" />
              </SelectTrigger>
              <SelectContent>
                {systemConfigs.map((system) => (
                  <SelectItem key={system.id} value={system.id}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="realm-desc">Description (optional)</Label>
            <Textarea
              id="realm-desc"
              placeholder="A high fantasy setting with..."
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          {generationSettingsSection}
        </div>

        <div className="rounded-lg border bg-card p-4">
          {calendarSettingsSection}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/realms" })}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateRealm}
            disabled={!createName.trim() || !createSystem || isCreating}
          >
            {isCreating
              ? genEnabled
                ? "Generating…"
                : "Creating..."
              : genEnabled
                ? "Generate World"
                : "Create Realm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
