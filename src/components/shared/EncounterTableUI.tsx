import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Dices, Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import type {
  EncounterTable,
  CustomEncounterSection,
} from "@domain/entities/EncounterTable";
import type { EncounterCategory } from "@shared/constants";
import { ENCOUNTER_CATEGORIES } from "@shared/constants";
import { DEFAULT_ENCOUNTER_ENTRIES } from "@domain/data/default-encounter-tables";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";

const CATEGORY_LABELS: Record<EncounterCategory, string> = {
  creature: "Creature",
  signOmen: "Sign / Omen",
  loss: "Loss",
  npc: "NPC",
  discovery: "Discovery",
  treasure: "Treasure",
};

type SavePayload = Pick<
  EncounterTable,
  | "creature"
  | "signOmen"
  | "loss"
  | "npc"
  | "discovery"
  | "treasure"
  | "customSections"
  | "disabledCategories"
>;

interface EncounterTableUIProps {
  table: EncounterTable | null | undefined;
  onRoll: () => Promise<RollEncounterResult>;
  onSave?: (entries: SavePayload) => void;
}

interface EditRow {
  type: "builtin";
  category: EncounterCategory;
  label: string;
  text: string;
  disabled: boolean;
}

export function EncounterTableUI({
  table,
  onRoll,
  onSave,
}: EncounterTableUIProps) {
  const [lastRoll, setLastRoll] = useState<RollEncounterResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  const handleRoll = async () => {
    const result = await onRoll();
    setLastRoll(result);
  };

  const disabledSet = new Set(table?.disabledCategories ?? []);

  // Build active display sections
  const displaySections: Array<{ label: string; entries: string[] }> = [];
  for (const cat of ENCOUNTER_CATEGORIES) {
    if (disabledSet.has(cat)) continue;
    const entries = table?.[cat]?.length
      ? table[cat]
      : [...DEFAULT_ENCOUNTER_ENTRIES[cat]];
    displaySections.push({ label: CATEGORY_LABELS[cat], entries });
  }
  for (const cs of table?.customSections ?? []) {
    if (cs.entries.length > 0) {
      displaySections.push({ label: cs.name, entries: cs.entries });
    }
  }

  const dieSize = displaySections.length || 6;

  const startEdit = () => {
    const rows: EditRow[] = [];
    for (const cat of ENCOUNTER_CATEGORIES) {
      const entries = table?.[cat]?.length
        ? table[cat]
        : [...DEFAULT_ENCOUNTER_ENTRIES[cat]];
      rows.push({
        type: "builtin",
        category: cat,
        label: CATEGORY_LABELS[cat],
        text: entries.join("\n"),
        disabled: disabledSet.has(cat),
      });
    }
    for (const cs of table?.customSections ?? []) {
      rows.push({
        type: "custom",
        id: cs.id,
        label: cs.name,
        text: cs.entries.join("\n"),
      });
    }
    setEditRows(rows);
    setEditing(true);
    setAddingSection(false);
    setNewSectionName("");
  };

  const updateEditRow = (index: number, updates: Partial<EditRow>) => {
    setEditRows((rows) =>
      rows.map((r, i) => (i === index ? ({ ...r, ...updates } as EditRow) : r)),
    );
  };

  const toggleBuiltinDisabled = (index: number) => {
    setEditRows((rows) =>
      rows.map((r, i) => {
        if (i !== index || r.type !== "builtin") return r;
        return { ...r, disabled: !r.disabled };
      }),
    );
  };

  const deleteCustomRow = (index: number) => {
    setEditRows((rows) => rows.filter((_, i) => i !== index));
  };

  const addCustomSection = () => {
    if (!newSectionName.trim()) return;
    setEditRows((rows) => [
      ...rows,
      {
        type: "custom" as const,
        id: crypto.randomUUID(),
        label: newSectionName.trim(),
        text: "",
      },
    ]);
    setNewSectionName("");
    setAddingSection(false);
  };

  const handleSave = () => {
    if (!onSave) return;
    const parse = (s: string) =>
      s
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const builtinData: Record<string, string[]> = {};
    const disabledCategories: EncounterCategory[] = [];
    const customSections: CustomEncounterSection[] = [];

    for (const row of editRows) {
      if (row.type === "builtin") {
        builtinData[row.category] = parse(row.text);
        if (row.disabled) disabledCategories.push(row.category);
      } else {
        const entries = parse(row.text);
        if (row.label.trim()) {
          customSections.push({ id: row.id, name: row.label, entries });
        }
      }
    }

    onSave({
      creature: builtinData.creature ?? [],
      signOmen: builtinData.signOmen ?? [],
      loss: builtinData.loss ?? [],
      npc: builtinData.npc ?? [],
      discovery: builtinData.discovery ?? [],
      treasure: builtinData.treasure ?? [],
      customSections,
      disabledCategories,
    });
    setEditing(false);
  };

  // Count active rows in edit mode
  const activeEditRows = editRows.filter(
    (r) => r.type === "custom" || !r.disabled,
  ).length;
  const editDieSize = activeEditRows || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleRoll}>
          <Dices className="mr-1.5 size-4" />
          Roll Encounter (d{dieSize})
        </Button>
        {onSave && !editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="mr-1.5 size-3.5" />
            Edit Tables
          </Button>
        )}
        {editing && (
          <>
            <Button size="sm" onClick={handleSave}>
              <Save className="mr-1.5 size-3.5" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              <X className="mr-1.5 size-3.5" />
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Last roll result */}
      {lastRoll && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-amber-600 hover:bg-amber-600 text-white">
              d{dieSize}: {lastRoll.categoryRoll}
            </Badge>
            <Badge variant="outline">{lastRoll.categoryLabel}</Badge>
          </div>
          <p className="text-sm font-medium">{lastRoll.result}</p>
        </div>
      )}

      {/* Table display */}
      {editing ? (
        <div className="space-y-2">
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 w-10">d{editDieSize}</th>
                  <th className="text-left p-2 w-28">Category</th>
                  <th className="text-left p-2">Entries</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let activeIdx = 0;
                  return editRows.map((row, i) => {
                    const isDisabled = row.type === "builtin" && row.disabled;
                    const rowNum = isDisabled ? "—" : String(++activeIdx);
                    return (
                      <tr
                        key={row.type === "builtin" ? row.category : row.id}
                        className={`border-b last:border-0 ${isDisabled ? "opacity-40" : ""}`}
                      >
                        <td className="p-2 font-mono text-muted-foreground">
                          {rowNum}
                        </td>
                        <td className="p-2 font-medium">
                          {row.type === "custom" ? (
                            <Input
                              value={row.label}
                              onChange={(e) =>
                                updateEditRow(i, { label: e.target.value })
                              }
                              className="h-7 text-xs"
                              placeholder="Section name"
                            />
                          ) : (
                            row.label
                          )}
                        </td>
                        <td className="p-2">
                          <Textarea
                            value={row.text}
                            onChange={(e) =>
                              updateEditRow(i, { text: e.target.value })
                            }
                            rows={3}
                            className="text-xs"
                            placeholder="One entry per line..."
                            disabled={isDisabled}
                          />
                        </td>
                        <td className="p-2">
                          {row.type === "builtin" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              onClick={() => toggleBuiltinDisabled(i)}
                              title={
                                row.disabled
                                  ? "Enable section"
                                  : "Disable section"
                              }
                            >
                              {row.disabled ? (
                                <Plus className="size-3.5" />
                              ) : (
                                <X className="size-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteCustomRow(i)}
                              title="Delete section"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Add custom section */}
          {addingSection ? (
            <div className="flex items-center gap-2">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Section name (e.g. Weather, Trap...)"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustomSection();
                  if (e.key === "Escape") setAddingSection(false);
                }}
              />
              <Button
                size="sm"
                onClick={addCustomSection}
                disabled={!newSectionName.trim()}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAddingSection(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingSection(true)}
            >
              <Plus className="mr-1.5 size-3.5" />
              Add Section
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 w-10">d{dieSize}</th>
                <th className="text-left p-2 w-28">Category</th>
                <th className="text-left p-2">Entries</th>
              </tr>
            </thead>
            <tbody>
              {displaySections.map((section, i) => {
                const isHighlighted = lastRoll?.categoryRoll === i + 1;
                return (
                  <tr
                    key={section.label}
                    className={`border-b last:border-0 ${isHighlighted ? "bg-amber-500/10" : ""}`}
                  >
                    <td className="p-2 font-mono text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="p-2 font-medium">{section.label}</td>
                    <td className="p-2">
                      <span className="text-xs text-muted-foreground">
                        {section.entries.join(", ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
