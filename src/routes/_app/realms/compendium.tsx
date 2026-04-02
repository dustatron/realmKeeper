import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@infrastructure/dexie/db";
import { useActiveRealm } from "~/ui/hooks/useActiveRealm";
import { useUIStore } from "~/ui/stores/uiStore";
import {
  getMonstersBySystemId,
  getSpellsBySystemId,
  getMagicItemsBySystemId,
  getEquipmentBySystemId,
  customEntryToMonster,
  customEntryToSpell,
  customEntryToMagicItem,
  customEntryToEquipment,
} from "@domain/data/compendium";
import type { CompendiumEntry } from "@domain/entities/Compendium";
import { PageHeader } from "~/components/shared/PageHeader";
import { FilterBar } from "~/components/shared/FilterBar";
import { SearchFilterToggles } from "~/components/shared/SearchFilterToggles";
import { EmptyState } from "~/components/shared/EmptyState";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Book,
  Sword,
  Wand2,
  Gem,
  Shield,
  Plus,
  Layers,
  BookOpen,
  Sparkles,
  Users,
  X,
  Paintbrush,
  Star,
} from "lucide-react";
import { NPC_RACES } from "@shared/constants";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { EquipmentTable } from "~/components/compendium/EquipmentTable";
import { MagicItemTable } from "~/components/compendium/MagicItemTable";
import { MonsterTable } from "~/components/compendium/MonsterTable";
import { SpellTable } from "~/components/compendium/SpellTable";
import {
  MonsterAdvancedFilters,
  DEFAULT_MONSTER_FILTERS,
  applyMonsterAdvancedFilters,
  type MonsterFilters,
} from "~/components/compendium/MonsterAdvancedFilters";
import {
  SpellAdvancedFilters,
  DEFAULT_SPELL_FILTERS,
  applySpellAdvancedFilters,
  type SpellFilters,
} from "~/components/compendium/SpellAdvancedFilters";
import {
  EquipmentAdvancedFilters,
  DEFAULT_EQUIPMENT_FILTERS,
  applyEquipmentAdvancedFilters,
  type EquipmentFilters,
} from "~/components/compendium/EquipmentAdvancedFilters";

const RACE_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#78716c",
  "#166534",
  "#1e293b",
  "#b45309",
];

export const Route = createFileRoute("/_app/realms/compendium")({
  component: CompendiumPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: string; q?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
});

export type SourceFilter = "all" | "system" | "custom";

function applySourceFilter<T extends CompendiumEntry>(
  items: T[],
  filter: SourceFilter,
): T[] {
  if (filter === "all") return items;
  if (filter === "custom") return items.filter((e) => e.systemId === "custom");
  return items.filter((e) => e.systemId !== "custom");
}

const sourceFilterOptions = [
  { value: "all", label: "All", icon: Layers },
  { value: "system", label: "System", icon: BookOpen },
  { value: "custom", label: "Custom", icon: Sparkles },
];

function RaceColorPicker({
  race,
  currentColor,
  onSelect,
}: {
  race: string;
  currentColor: string | null;
  onSelect: (race: string, color: string | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="size-5 rounded-full border border-border hover:scale-110 transition-transform shrink-0 flex items-center justify-center"
          style={currentColor ? { backgroundColor: currentColor } : undefined}
          title={`Set color for ${race}`}
        >
          {!currentColor && (
            <Paintbrush className="size-3 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {/* Clear option */}
          <button
            className={`size-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
              currentColor === null
                ? "border-foreground scale-110"
                : "border-border"
            }`}
            onClick={() => onSelect(race, null)}
            title="No color"
          >
            <X className="size-3 text-muted-foreground" />
          </button>
          {RACE_PALETTE.map((c) => (
            <button
              key={c}
              className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                currentColor === c
                  ? "border-foreground scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              onClick={() => onSelect(race, c)}
              title={c}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CompendiumPage() {
  const realm = useActiveRealm();
  const activeRealmId = useUIStore((s) => s.activeRealmId);
  const navigate = useNavigate({ from: "/realms/compendium" });
  const { tab: tabParam, q: searchQuery = "" } = Route.useSearch();
  const systemId = realm?.systemId ?? "";
  const starredMonsterIds = realm?.starredMonsterIds ?? [];
  const starredSpellIds = realm?.starredSpellIds ?? [];
  const starredMagicItemIds = realm?.starredMagicItemIds ?? [];

  const handleToggleMonsterStar = async (monsterId: string) => {
    if (!realm) return;
    const updated = starredMonsterIds.includes(monsterId)
      ? starredMonsterIds.filter((id) => id !== monsterId)
      : [...starredMonsterIds, monsterId];
    await db.worlds.update(realm.id, {
      starredMonsterIds: updated,
      updatedAt: Date.now(),
    });
  };

  const handleToggleSpellStar = async (spellId: string) => {
    if (!realm) return;
    const updated = starredSpellIds.includes(spellId)
      ? starredSpellIds.filter((id) => id !== spellId)
      : [...starredSpellIds, spellId];
    await db.worlds.update(realm.id, {
      starredSpellIds: updated,
      updatedAt: Date.now(),
    });
  };

  const handleToggleMagicItemStar = async (itemId: string) => {
    if (!realm) return;
    const updated = starredMagicItemIds.includes(itemId)
      ? starredMagicItemIds.filter((id) => id !== itemId)
      : [...starredMagicItemIds, itemId];
    await db.worlds.update(realm.id, {
      starredMagicItemIds: updated,
      updatedAt: Date.now(),
    });
  };

  // Custom entries from Dexie
  const customEntries =
    useLiveQuery(
      () =>
        activeRealmId
          ? db.customCompendiumEntries
              .where("worldId")
              .equals(activeRealmId)
              .toArray()
          : [],
      [activeRealmId],
    ) ?? [];

  const customMonsters = useMemo(
    () =>
      customEntries
        .filter((e) => e.kind === "monster")
        .map(customEntryToMonster),
    [customEntries],
  );
  const customSpells = useMemo(
    () =>
      customEntries.filter((e) => e.kind === "spell").map(customEntryToSpell),
    [customEntries],
  );
  const customMagicItems = useMemo(
    () =>
      customEntries
        .filter((e) => e.kind === "magicItem")
        .map(customEntryToMagicItem),
    [customEntries],
  );
  const customEquipment = useMemo(
    () =>
      customEntries
        .filter((e) => e.kind === "equipment")
        .map(customEntryToEquipment),
    [customEntries],
  );

  const monsters = useMemo(
    () => [...getMonstersBySystemId(systemId), ...customMonsters],
    [systemId, customMonsters],
  );
  const spells = useMemo(
    () => [...getSpellsBySystemId(systemId), ...customSpells],
    [systemId, customSpells],
  );
  const magicItems = useMemo(
    () => [...getMagicItemsBySystemId(systemId), ...customMagicItems],
    [systemId, customMagicItems],
  );
  const equipment = useMemo(
    () => [...getEquipmentBySystemId(systemId), ...customEquipment],
    [systemId, customEquipment],
  );

  const setSearchQuery = (value: string) => {
    navigate({
      search: (prev) => ({ ...prev, q: value || undefined }),
      replace: true,
    });
  };

  const [filterSource, setFilterSource] = useState<SourceFilter>("all");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [monsterFilters, setMonsterFilters] = useState<MonsterFilters>(DEFAULT_MONSTER_FILTERS);
  const [monsterFiltersOpen, setMonsterFiltersOpen] = useState(false);
  const [spellFilters, setSpellFilters] = useState<SpellFilters>(DEFAULT_SPELL_FILTERS);
  const [spellFiltersOpen, setSpellFiltersOpen] = useState(false);
  const [equipmentFilters, setEquipmentFilters] = useState<EquipmentFilters>(DEFAULT_EQUIPMENT_FILTERS);
  const [equipmentFiltersOpen, setEquipmentFiltersOpen] = useState(false);
  const isShadowdark = systemId === "system-shadowdark";

  const filteredMonsters = useMemo(() => {
    let result = applySourceFilter(monsters, filterSource);
    if (showStarredOnly) result = result.filter((m) => starredMonsterIds.includes(m.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      );
    }
    if (isShadowdark) result = applyMonsterAdvancedFilters(result, monsterFilters);
    return result;
  }, [monsters, searchQuery, filterSource, showStarredOnly, starredMonsterIds, monsterFilters, isShadowdark]);

  const filteredSpells = useMemo(() => {
    let result = applySourceFilter(spells, filterSource);
    if (showStarredOnly) result = result.filter((s) => starredSpellIds.includes(s.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    if (isShadowdark) result = applySpellAdvancedFilters(result, spellFilters);
    return result;
  }, [spells, searchQuery, filterSource, showStarredOnly, starredSpellIds, spellFilters, isShadowdark]);

  const filteredMagicItems = useMemo(() => {
    let result = applySourceFilter(magicItems, filterSource);
    if (showStarredOnly) result = result.filter((i) => starredMagicItemIds.includes(i.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [magicItems, searchQuery, filterSource, showStarredOnly, starredMagicItemIds]);

  const filteredEquipment = useMemo(() => {
    let result = applySourceFilter(equipment, filterSource);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }
    result = applyEquipmentAdvancedFilters(result, equipmentFilters);
    return result;
  }, [equipment, searchQuery, filterSource, equipmentFilters]);

  // Custom races state
  const [newRace, setNewRace] = useState("");
  const customRaces = realm?.customRaces ?? [];
  const raceColors = realm?.raceColors ?? {};

  const handleSetRaceColor = async (race: string, color: string | null) => {
    if (!realm) return;
    const key = race.toLowerCase();
    const updated = { ...raceColors };
    if (color) {
      updated[key] = color;
    } else {
      delete updated[key];
    }
    await db.worlds.update(realm.id, {
      raceColors: updated,
      updatedAt: Date.now(),
    });
  };

  const handleAddRace = async () => {
    const trimmed = newRace.trim();
    if (!trimmed || !realm) return;
    const lower = trimmed.toLowerCase();
    // Check duplicates against built-in + existing custom
    if (
      (NPC_RACES as readonly string[]).includes(lower) ||
      customRaces.some((r) => r.toLowerCase() === lower)
    )
      return;
    await db.worlds.update(realm.id, {
      customRaces: [...customRaces, trimmed],
      updatedAt: Date.now(),
    });
    setNewRace("");
  };

  const handleRemoveRace = async (race: string) => {
    if (!realm) return;
    await db.worlds.update(realm.id, {
      customRaces: customRaces.filter((r) => r !== race),
      updatedAt: Date.now(),
    });
  };

  type TabDef = {
    value: string;
    label: string;
    icon: typeof Book;
    count: number;
    alwaysShow?: boolean;
  };
  const tabs: TabDef[] = [
    {
      value: "monsters",
      label: "Monsters",
      icon: Sword,
      count: monsters.length,
    },
    { value: "spells", label: "Spells", icon: Wand2, count: spells.length },
    {
      value: "magic-items",
      label: "Magic Items",
      icon: Gem,
      count: magicItems.length,
    },
    {
      value: "equipment",
      label: "Equipment",
      icon: Shield,
      count: equipment.length,
    },
    {
      value: "races",
      label: "Races",
      icon: Users,
      count: NPC_RACES.length + customRaces.length,
      alwaysShow: true,
    },
  ].filter((t) => t.alwaysShow || t.count > 0);

  if (!realm) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Compendium"
          description="Browse game system reference data."
        />
        <EmptyState
          icon={Book}
          title="No realm selected"
          description="Select a realm to browse its compendium."
        />
      </div>
    );
  }

  if (tabs.length === 0 && !activeRealmId) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Compendium"
          description="Browse game system reference data."
        />
        <EmptyState
          icon={Book}
          title="No compendium data"
          description="This system has no compendium entries."
        />
      </div>
    );
  }

  const validTabs = tabs.map((t) => t.value);
  const fallbackTab = validTabs[0] ?? "monsters";
  const activeTab =
    tabParam && validTabs.includes(tabParam) ? tabParam : fallbackTab;

  const handleTabChange = (value: string) => {
    navigate({
      to: "/realms/compendium",
      search: value === fallbackTab ? {} : { tab: value },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* <PageHeader
        title="Compendium"
        description="Browse game system reference data."
        actions={
          <Link to="/realms/compendium/custom/new">
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Custom Entry
            </Button>
          </Link>
        }
      /> */}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center gap-2">
          <div className="overflow-x-auto min-w-0 flex-1">
            <TabsList className="w-max">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                  <t.icon className="size-4 shrink-0" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex ml-1 text-xs">
                    {t.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <Link to="/realms/compendium/custom/new" className="shrink-0">
            <Button size="sm">
              <Plus className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">New Custom Entry</span>
            </Button>
          </Link>
        </div>

        {/* Races */}
        <TabsContent value="races">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={newRace}
                onChange={(e) => setNewRace(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRace()}
                placeholder="Add custom race..."
                className="max-w-xs"
              />
              <Button
                size="sm"
                onClick={handleAddRace}
                disabled={!newRace.trim()}
              >
                <Plus className="mr-1.5 size-4" />
                Add
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Built-in Races
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {NPC_RACES.map((r) => (
                  <div key={r} className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      style={
                        raceColors[r]
                          ? {
                              backgroundColor: raceColors[r] + "20",
                              borderColor: raceColors[r],
                            }
                          : undefined
                      }
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Badge>
                    <RaceColorPicker
                      race={r}
                      currentColor={raceColors[r] ?? null}
                      onSelect={handleSetRaceColor}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Custom Races ({customRaces.length})
              </h4>
              {customRaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No custom races yet. Add one above to make it available in NPC
                  race dropdowns.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {customRaces.map((r) => {
                    const key = r.toLowerCase();
                    return (
                      <div key={r} className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="gap-1 pr-1"
                          style={
                            raceColors[key]
                              ? {
                                  backgroundColor: raceColors[key] + "20",
                                  borderColor: raceColors[key],
                                }
                              : undefined
                          }
                        >
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                          <button
                            onClick={() => handleRemoveRace(r)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                        <RaceColorPicker
                          race={key}
                          currentColor={raceColors[key] ?? null}
                          onSelect={handleSetRaceColor}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Monsters */}
        <TabsContent value="monsters">
          <div className="space-y-4">
            <FilterBar search={searchQuery} onSearchChange={setSearchQuery}>
              <SearchFilterToggles
                type="single"
                value={filterSource}
                onChange={(v) => setFilterSource(v as SourceFilter)}
                options={sourceFilterOptions}
              />
              <Button
                size="sm"
                variant={showStarredOnly ? "default" : "outline"}
                onClick={() => setShowStarredOnly((v) => !v)}
                className="gap-1.5"
              >
                <Star className="size-3.5" />
                Starred
              </Button>
            </FilterBar>
            {isShadowdark && (
              <MonsterAdvancedFilters
                filters={monsterFilters}
                onChange={setMonsterFilters}
                open={monsterFiltersOpen}
                onToggleOpen={() => setMonsterFiltersOpen((v) => !v)}
              />
            )}
            {filteredMonsters.length === 0 ? (
              <EmptyState
                icon={Sword}
                title="No matches"
                description="Try a different search or filter."
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <MonsterTable
                  monsters={filteredMonsters}
                  starredIds={starredMonsterIds}
                  onToggleStar={handleToggleMonsterStar}
                  systemId={systemId}
                />
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* Spells */}
        <TabsContent value="spells">
          <div className="space-y-4">
            <FilterBar search={searchQuery} onSearchChange={setSearchQuery}>
              <SearchFilterToggles
                type="single"
                value={filterSource}
                onChange={(v) => setFilterSource(v as SourceFilter)}
                options={sourceFilterOptions}
              />
              <Button
                size="sm"
                variant={showStarredOnly ? "default" : "outline"}
                onClick={() => setShowStarredOnly((v) => !v)}
                className="gap-1.5"
              >
                <Star className="size-3.5" />
                Starred
              </Button>
            </FilterBar>
            {isShadowdark && (
              <SpellAdvancedFilters
                filters={spellFilters}
                onChange={setSpellFilters}
                open={spellFiltersOpen}
                onToggleOpen={() => setSpellFiltersOpen((v) => !v)}
              />
            )}
            {filteredSpells.length === 0 ? (
              <EmptyState
                icon={Wand2}
                title="No matches"
                description="Try a different search or filter."
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <SpellTable
                  spells={filteredSpells}
                  starredIds={starredSpellIds}
                  onToggleStar={handleToggleSpellStar}
                />
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* Magic Items */}
        <TabsContent value="magic-items">
          <div className="space-y-4">
            <FilterBar search={searchQuery} onSearchChange={setSearchQuery}>
              <SearchFilterToggles
                type="single"
                value={filterSource}
                onChange={(v) => setFilterSource(v as SourceFilter)}
                options={sourceFilterOptions}
              />
              <Button
                size="sm"
                variant={showStarredOnly ? "default" : "outline"}
                onClick={() => setShowStarredOnly((v) => !v)}
                className="gap-1.5"
              >
                <Star className="size-3.5" />
                Starred
              </Button>
            </FilterBar>
            {filteredMagicItems.length === 0 ? (
              <EmptyState
                icon={Gem}
                title="No matches"
                description="Try a different search or filter."
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <MagicItemTable
                  items={filteredMagicItems}
                  starredIds={starredMagicItemIds}
                  onToggleStar={handleToggleMagicItemStar}
                />
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* Equipment */}
        {equipment.length > 0 && (
          <TabsContent value="equipment">
            <div className="space-y-4">
              <FilterBar search={searchQuery} onSearchChange={setSearchQuery}>
                <SearchFilterToggles
                  type="single"
                  value={filterSource}
                  onChange={(v) => setFilterSource(v as SourceFilter)}
                  options={sourceFilterOptions}
                />
              </FilterBar>
              <EquipmentAdvancedFilters
                filters={equipmentFilters}
                onChange={setEquipmentFilters}
                open={equipmentFiltersOpen}
                onToggleOpen={() => setEquipmentFiltersOpen((v) => !v)}
                systemId={systemId}
              />
              {filteredEquipment.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No matches"
                  description="Try a different search."
                />
              ) : (
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <EquipmentTable items={filteredEquipment} />
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
