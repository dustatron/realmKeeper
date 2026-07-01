import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { LootDensity } from "@domain/services/worldgen/lootDensity";
import type { ResourcePack } from "@domain/data/worldgen/resources.catalog";
import {
  RESOURCE_PACKS,
  DEFAULT_PACKS,
  PACK_LABELS,
  autoProposeResources,
} from "@domain/data/worldgen/resourcePacks";
import { SeededRandom } from "~/lib/dungeon/SeededRandom";
import { ResourceMultiselect } from "~/ui/components/realm/ResourceMultiselect";
import { BiomePreview } from "~/ui/components/realm/BiomePreview";
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
import { Toggle } from "~/components/ui/toggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Aperture,
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

// Themed doom-event names offered per enabled pack. Filtered by which packs the
// user has on; "Random" and "None" are always available.
const DOOM_NAMES_BY_PACK: Record<ResourcePack, string[]> = {
  "low-fantasy": [
    "The Salt-Death",
    "The Long Hunger",
    "War of the Silver Mine",
  ],
  "high-fantasy": [
    "The Crystal Wakes",
    "The Wyrm Claims the Peak",
    "The Blight Spreads",
  ],
  "sci-fi": ["The Machine Below Stirs", "Mutagen Bloom"],
  doomed: ["The Tide of Ash", "The Cursed Lode", "The Dead Walk the Roads"],
};

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
  // null = auto: let the engine scale faction count with map size (settlements/4).
  const [genFactions, setGenFactions] = useState<number | null>(null);
  const [genPoiDensity, setGenPoiDensity] = useState<
    "sparse" | "normal" | "dense"
  >("normal");
  const [genPortals, setGenPortals] = useState(true);
  const [genTreasureDensity, setGenTreasureDensity] =
    useState<LootDensity>("moderate");
  const [genMagicDensity, setGenMagicDensity] =
    useState<LootDensity>("moderate");
  const [genMonsterDensity, setGenMonsterDensity] =
    useState<LootDensity>("moderate");

  // Resource-driven terrain controls.
  const [genPacks, setGenPacks] = useState<ResourcePack[]>([...DEFAULT_PACKS]);
  const [genResources, setGenResources] = useState<string[]>([]);
  const [genUnclaimed, setGenUnclaimed] = useState(genSize === "large");
  const [genLeyLines, setGenLeyLines] = useState(true);
  const [genExpandedNames, setGenExpandedNames] = useState(true);
  const [genDoom, setGenDoom] = useState<string>("random");

  // Auto-propose resources from packs/size/seed, then let the user edit. Re-runs
  // whenever the inputs change; user edits are overwritten on the next change of
  // packs/size/seed (the propose inputs), which is the intended behavior.
  useEffect(() => {
    const rng = new SeededRandom(newId());
    setGenResources(autoProposeResources(genPacks, genSize, rng));
  }, [genPacks, genSize]);

  const togglePack = (pack: ResourcePack, on: boolean) => {
    setGenPacks((prev) =>
      on ? [...prev, pack] : prev.filter((p) => p !== pack),
    );
  };

  // Doom options visible to the user: Random/None plus themed names from enabled
  // packs. Stable order (RESOURCE_PACKS), de-duped across overlapping packs.
  const doomOptions = (() => {
    const enabled = new Set(genPacks);
    const names: string[] = [];
    for (const pack of RESOURCE_PACKS) {
      if (!enabled.has(pack)) continue;
      for (const name of DOOM_NAMES_BY_PACK[pack]) {
        if (!names.includes(name)) names.push(name);
      }
    }
    return names;
  })();

  // If a themed doom was picked then its pack is disabled, fall back to Random.
  useEffect(() => {
    if (
      genDoom !== "random" &&
      genDoom !== "none" &&
      !doomOptions.includes(genDoom)
    ) {
      setGenDoom("random");
    }
  }, [genDoom, doomOptions]);

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
            seed: newId(),
            size: genSize,
            watchesPerDay: createWatchesPerDay,
            daysPerSeason: createDaysPerSeason,
            daysPerWeek: createDaysPerWeek,
            moonCycleLength: createMoonCycleLength,
            factionTurnTrigger: createFactionTurnTrigger,
            poiDensity: genPoiDensity,
            factionCount: genFactions ?? undefined,
            resources: genResources,
            packs: genPacks,
            unclaimedDeposits: genUnclaimed,
            leyLines: genLeyLines,
            expandedNames: genExpandedNames,
            doom: genDoom,
            loomingThreat: genDoom !== "none",
            portals: genPortals,
            worldTreasureDensity: genTreasureDensity,
            worldMagicDensity: genMagicDensity,
            worldMonsterDensity: genMonsterDensity,
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
            hookRepo: container.hookRepo,
            rumorRepo: container.rumorRepo,
            noticeRepo: container.noticeRepo,
            tableRepo: container.tableRepo,
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
    <div className="space-y-3 rounded-lg border p-4">
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
          <div className="space-y-2">
            <Label className="text-xs">Theme packs</Label>
            <p className="text-[11px] text-muted-foreground">
              Each pack widens the resource pool a world can draw from.
            </p>
            <div className="flex flex-wrap gap-2">
              {RESOURCE_PACKS.map((pack) => (
                <Toggle
                  key={pack}
                  size="sm"
                  variant="outline"
                  pressed={genPacks.includes(pack)}
                  onPressedChange={(on) => togglePack(pack, on)}
                  disabled={isCreating}
                >
                  {PACK_LABELS[pack]}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Resources</Label>
            <p className="text-[11px] text-muted-foreground">
              Raw resources determine the map's biomes. Auto-proposed from your
              packs, size, and seed — edit freely.
            </p>
            <ResourceMultiselect
              value={genResources}
              onChange={setGenResources}
              packs={genPacks}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Biome preview</Label>
            <BiomePreview resources={genResources} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium">Advanced</p>
            <p className="text-xs text-muted-foreground">
              Fine-tune what gets generated: how many factions vie for power,
              how densely the map is dotted with points of interest, and whether
              a realm-wide doom event builds toward a climax.
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
                  placeholder="Auto (scales with map)"
                  value={genFactions ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setGenFactions(v === "" ? null : parseInt(v) || 0);
                  }}
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
            <div className="grid gap-1.5">
              <Label htmlFor="gen-doom" className="text-xs">
                Doom event
              </Label>
              <span className="text-[11px] text-muted-foreground">
                A realm-wide threat that builds toward a climax over time.
              </span>
              <Select
                value={genDoom}
                onValueChange={setGenDoom}
                disabled={isCreating}
              >
                <SelectTrigger id="gen-doom">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                  {doomOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-0.5">
                <Label htmlFor="gen-unclaimed" className="text-xs">
                  Unclaimed deposits
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Unclaimed resource veins become adventure sites.
                </span>
              </div>
              <Switch
                id="gen-unclaimed"
                checked={genUnclaimed}
                onCheckedChange={setGenUnclaimed}
                disabled={isCreating}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-0.5">
                <Label htmlFor="gen-ley-lines" className="text-xs">
                  Ley lines
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Magical ley lines linking power sites.
                </span>
              </div>
              <Switch
                id="gen-ley-lines"
                checked={genLeyLines}
                onCheckedChange={setGenLeyLines}
                disabled={isCreating}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-0.5">
                <Label
                  htmlFor="gen-portals"
                  className="flex items-center gap-2 text-xs"
                >
                  <Aperture className="size-3.5" /> Portals
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Rare planar gates linking distant regions for fast travel.
                </span>
              </div>
              <Switch
                id="gen-portals"
                checked={genPortals}
                onCheckedChange={setGenPortals}
                disabled={isCreating}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-0.5">
                <Label htmlFor="gen-expanded-names" className="text-xs">
                  Expanded names
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Draw NPC names from a large curated pool so the world rarely
                  repeats a name (ordinary human names + flavored races).
                </span>
              </div>
              <Switch
                id="gen-expanded-names"
                checked={genExpandedNames}
                onCheckedChange={setGenExpandedNames}
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
                    <Gem className="size-3.5" /> Treasure
                  </Label>
                  <Select
                    value={genTreasureDensity}
                    onValueChange={(v) =>
                      setGenTreasureDensity(v as LootDensity)
                    }
                    disabled={isCreating}
                  >
                    <SelectTrigger id="gen-treasure" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="sparse">Sparse</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="frequent">Frequent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="gen-magic-items"
                    className="flex items-center gap-2 text-xs"
                  >
                    <Sparkles className="size-3.5" /> Magic items
                  </Label>
                  <Select
                    value={genMagicDensity}
                    onValueChange={(v) => setGenMagicDensity(v as LootDensity)}
                    disabled={isCreating}
                  >
                    <SelectTrigger id="gen-magic-items" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="sparse">Sparse</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="frequent">Frequent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="gen-monsters"
                    className="flex items-center gap-2 text-xs"
                  >
                    <Skull className="size-3.5" /> Monsters
                  </Label>
                  <Select
                    value={genMonsterDensity}
                    onValueChange={(v) =>
                      setGenMonsterDensity(v as LootDensity)
                    }
                    disabled={isCreating}
                  >
                    <SelectTrigger id="gen-monsters" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="sparse">Sparse</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="frequent">Frequent</SelectItem>
                    </SelectContent>
                  </Select>
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

      <div className="mx-auto max-w-4xl space-y-4">
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

        <div className="rounded-lg border bg-card p-0">
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
