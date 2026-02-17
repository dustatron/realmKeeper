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
} from "lucide-react";
import { EquipmentTable } from "~/components/compendium/EquipmentTable";
import { MagicItemCard } from "~/components/compendium/MagicItemCard";
import { MonsterCard } from "~/components/compendium/MonsterCards";
import { SpellCard } from "~/components/compendium/SpellCard";

export const Route = createFileRoute("/_app/realms/compendium")({
  component: CompendiumPage,
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
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

function CompendiumPage() {
  const realm = useActiveRealm();
  const activeRealmId = useUIStore((s) => s.activeRealmId);
  const navigate = useNavigate();
  const { tab: tabParam } = Route.useSearch();
  const systemId = realm?.systemId ?? "";

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
  const equipment = useMemo(() => getEquipmentBySystemId(systemId), [systemId]);

  const [monsterSearch, setMonsterSearch] = useState("");
  const [spellSearch, setSpellSearch] = useState("");
  const [magicItemSearch, setMagicItemSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");

  const [filterSource, setFilterSource] = useState<SourceFilter>("all");

  const filteredMonsters = useMemo(() => {
    let result = applySourceFilter(monsters, filterSource);
    if (monsterSearch) {
      const q = monsterSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [monsters, monsterSearch, filterSource]);

  const filteredSpells = useMemo(() => {
    let result = applySourceFilter(spells, filterSource);
    if (spellSearch) {
      const q = spellSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [spells, spellSearch, filterSource]);

  const filteredMagicItems = useMemo(() => {
    let result = applySourceFilter(magicItems, filterSource);
    if (magicItemSearch) {
      const q = magicItemSearch.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [magicItems, magicItemSearch, filterSource]);

  const filteredEquipment = useMemo(() => {
    if (!equipmentSearch) return equipment;
    const q = equipmentSearch.toLowerCase();
    return equipment.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [equipment, equipmentSearch]);

  type TabDef = {
    value: string;
    label: string;
    icon: typeof Book;
    count: number;
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
  ].filter((t) => t.count > 0);

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
      replace: true,
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
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="size-4" />
              {t.label}
              <Badge variant="secondary" className="ml-1 text-xs">
                {t.count}
              </Badge>
            </TabsTrigger>
          ))}
          <Link to="/realms/compendium/custom/new">
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Custom Entry
            </Button>
          </Link>
        </TabsList>

        {/* Monsters */}
        <TabsContent value="monsters">
          <div className="space-y-4">
            <FilterBar search={monsterSearch} onSearchChange={setMonsterSearch}>
              <SearchFilterToggles
                type="single"
                value={filterSource}
                onChange={(v) => setFilterSource(v as SourceFilter)}
                options={sourceFilterOptions}
              />
            </FilterBar>
            {filteredMonsters.length === 0 ? (
              <EmptyState
                icon={Sword}
                title="No matches"
                description="Try a different search or filter."
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMonsters.map((m) => (
                    <MonsterCard key={m.id} monster={m} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* Spells */}
        <TabsContent value="spells">
          <div className="space-y-4">
            <FilterBar search={spellSearch} onSearchChange={setSpellSearch}>
              <SearchFilterToggles
                type="single"
                value={filterSource}
                onChange={(v) => setFilterSource(v as SourceFilter)}
                options={sourceFilterOptions}
              />
            </FilterBar>
            {filteredSpells.length === 0 ? (
              <EmptyState
                icon={Wand2}
                title="No matches"
                description="Try a different search or filter."
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredSpells.map((s) => (
                    <SpellCard key={s.id} spell={s} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* Magic Items */}
        <TabsContent value="magic-items">
          <div className="space-y-4">
            <FilterBar
              search={magicItemSearch}
              onSearchChange={setMagicItemSearch}
            >
              <SearchFilterToggles
                type="single"
                value={filterSource}
                onChange={(v) => setFilterSource(v as SourceFilter)}
                options={sourceFilterOptions}
              />
            </FilterBar>
            {filteredMagicItems.length === 0 ? (
              <EmptyState
                icon={Gem}
                title="No matches"
                description="Try a different search or filter."
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-16rem)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMagicItems.map((i) => (
                    <MagicItemCard key={i.id} item={i} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* Equipment */}
        {equipment.length > 0 && (
          <TabsContent value="equipment">
            <div className="space-y-4">
              <FilterBar
                search={equipmentSearch}
                onSearchChange={setEquipmentSearch}
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
