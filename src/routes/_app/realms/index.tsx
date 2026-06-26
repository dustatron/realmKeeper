import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@infrastructure/dexie/db";
import { PageHeader } from "~/components/shared/PageHeader";
import { EmptyState } from "~/components/shared/EmptyState";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  LayoutDashboard,
  Plus,
  Trash2,
  Download,
  Upload,
  Crown,
  Pencil,
  CheckCircle2,
  Circle,
  ListChecks,
  X,
} from "lucide-react";
// useRealms replaced by direct useLiveQuery to detect loading vs empty
import { useSystemConfigs } from "~/ui/hooks/useSystemConfigs";
import { useContainer } from "~/ui/hooks/useContainer";
import { useUIStore } from "~/ui/stores/uiStore";
import { executeDeleteRealm } from "@application/use-cases/DeleteRealm";
import { executeDeleteRealms } from "@application/use-cases/DeleteRealms";
import { executeExportRealm } from "@application/use-cases/ExportRealm";
import { executeImportRealm } from "@application/use-cases/ImportRealm";
import { Dashboard } from "~/components/realm/Dashboard";
import type { RealmExport } from "@application/use-cases/ExportRealm";

export const Route = createFileRoute("/_app/realms/")({
  component: RealmsPage,
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
});

function RealmsPage() {
  const navigate = useNavigate();
  const container = useContainer();
  const rawRealms = useLiveQuery(() => db.worlds.toArray());
  const realmsLoaded = rawRealms !== undefined;
  const realms = rawRealms ?? [];
  const systemConfigs = useSystemConfigs();
  const setActiveRealmId = useUIStore((state) => state.setActiveRealmId);
  const activeRealmId = useUIStore((state) => state.activeRealmId);
  const { tab } = Route.useSearch();

  // Clear stale activeRealmId if the realm no longer exists in DB (e.g. DB was
  // deleted). The `realms` live query can briefly lag a just-created realm, so
  // confirm against the DB before clearing — otherwise we'd null the active
  // realm immediately after generating a world (the race that left a freshly
  // generated realm showing "No Realm").
  useEffect(() => {
    if (
      realmsLoaded &&
      activeRealmId &&
      !realms.some((r) => r.id === activeRealmId)
    ) {
      let cancelled = false;
      db.worlds.get(activeRealmId).then((world) => {
        if (!cancelled && !world) setActiveRealmId(null);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [realmsLoaded, activeRealmId, realms, setActiveRealmId]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Bulk-delete selection mode: lets a GM clear out several realms (e.g.
  // throwaway test worlds) at once instead of one card at a time.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleDeleteRealm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await executeDeleteRealm(deleteTarget, {
        realmRepo: container.realmRepo,
      });
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete realm:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (worldId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(worldId)) next.delete(worldId);
      else next.add(worldId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await executeDeleteRealms([...selectedIds], {
        realmRepo: container.realmRepo,
      });
      // Clear the active realm if it was among those deleted.
      if (activeRealmId && selectedIds.has(activeRealmId)) {
        setActiveRealmId(null);
      }
      setShowBulkDelete(false);
      exitSelectMode();
    } catch (error) {
      console.error("Failed to delete realms:", error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportRealm = async (worldId: string) => {
    try {
      const data = await executeExportRealm(worldId, {
        realmRepo: container.realmRepo,
        regionRepo: container.regionRepo,
        factionRepo: container.factionRepo,
        npcRepo: container.npcRepo,
        relationshipRepo: container.factionRelationshipRepo,
        worldEventRepo: container.worldEventRepo,
        weatherRepo: container.weatherRepo,
        realmNoteRepo: container.realmNoteRepo,
        poiRepo: container.poiRepo,
        pathRepo: container.pathRepo,
        factionPresenceRepo: container.factionPresenceRepo,
        poiEventRepo: container.poiEventRepo,
        gameMapRepo: container.gameMapRepo,
        connectionRepo: container.connectionRepo,
        hookRepo: container.hookRepo,
      });

      if (!data) return;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data.realm.name.toLowerCase().replace(/\s+/g, "-")}-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export realm:", error);
    }
  };

  const handleImportRealm = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: RealmExport = JSON.parse(text);

      const newRealmId = await executeImportRealm(data, {
        realmRepo: container.realmRepo,
        regionRepo: container.regionRepo,
        factionRepo: container.factionRepo,
        npcRepo: container.npcRepo,
        relationshipRepo: container.factionRelationshipRepo,
        worldEventRepo: container.worldEventRepo,
        weatherRepo: container.weatherRepo,
        realmNoteRepo: container.realmNoteRepo,
        poiRepo: container.poiRepo,
        pathRepo: container.pathRepo,
        factionPresenceRepo: container.factionPresenceRepo,
        poiEventRepo: container.poiEventRepo,
        gameMapRepo: container.gameMapRepo,
        connectionRepo: container.connectionRepo,
        hookRepo: container.hookRepo,
      });

      setActiveRealmId(newRealmId);
    } catch (error) {
      console.error("Failed to import realm:", error);
    }

    event.target.value = "";
  };

  const handleRealmClick = (worldId: string) => {
    setActiveRealmId(worldId);
    navigate({ to: "/realms" });
  };

  const openEditRealm = (worldId: string) => {
    const realm = realms.find((r) => r.id === worldId);
    if (!realm) return;
    setEditTarget(worldId);
    setEditName(realm.name);
    setEditDesc(realm.description);
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editName.trim()) return;
    const realm = realms.find((r) => r.id === editTarget);
    if (!realm) return;

    setIsSavingEdit(true);
    try {
      await container.realmRepo.update({
        ...realm,
        name: editName.trim(),
        description: editDesc.trim(),
        updatedAt: Date.now(),
      });
      setEditTarget(null);
    } catch (error) {
      console.error("Failed to update realm:", error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Wait for the realms query to resolve before deciding what to render —
  // otherwise the "No realms yet" empty state flashes for a frame on every load
  // while useLiveQuery is still pending (rawRealms === undefined).
  if (!realmsLoaded) {
    return null;
  }

  // Show dashboard when a realm is active and confirmed to exist
  if (
    activeRealmId &&
    realmsLoaded &&
    realms.some((r) => r.id === activeRealmId)
  ) {
    return (
      <Dashboard
        worldId={activeRealmId}
        tab={tab}
        onTabChange={(newTab) =>
          navigate({
            to: "/realms",
            search: { tab: newTab },
            replace: true,
          })
        }
      />
    );
  }

  if (realms.length === 0) {
    return (
      <div>
        <PageHeader title="World" description="Select or create a realm." />
        <EmptyState
          icon={LayoutDashboard}
          title="No realms yet"
          description="Create your first realm to start building your world."
          action={
            <div className="flex gap-2">
              <Button onClick={() => navigate({ to: "/realms/new" })}>
                <Plus className="mr-2 size-4" />
                New Realm
              </Button>
              <label htmlFor="import-realm">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 size-4" />
                    Import
                  </span>
                </Button>
              </label>
              <input
                id="import-realm"
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportRealm}
              />
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Realms"
        description="Select or create a realm."
        actions={
          selectMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelectedIds(
                    selectedIds.size === realms.length
                      ? new Set()
                      : new Set(realms.map((r) => r.id)),
                  )
                }
              >
                {selectedIds.size === realms.length
                  ? "Clear all"
                  : "Select all"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setShowBulkDelete(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete ({selectedIds.size})
              </Button>
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                <X className="mr-2 size-4" />
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => navigate({ to: "/realms/new" })}>
                <Plus className="mr-2 size-4" />
                New Realm
              </Button>
              {realms.length > 1 && (
                <Button variant="outline" onClick={() => setSelectMode(true)}>
                  <ListChecks className="mr-2 size-4" />
                  Select
                </Button>
              )}
              <label htmlFor="import-realm-header">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 size-4" />
                    Import
                  </span>
                </Button>
              </label>
              <input
                id="import-realm-header"
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportRealm}
              />
            </div>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {realms.map((realm) => {
          const system = systemConfigs.find((s) => s.id === realm.systemId);
          const selected = selectedIds.has(realm.id);
          return (
            <Card
              key={realm.id}
              className={`relative cursor-pointer transition-shadow hover:shadow-elevated ${
                selectMode && selected ? "ring-2 ring-destructive" : ""
              }`}
              onClick={() =>
                selectMode
                  ? toggleSelected(realm.id)
                  : handleRealmClick(realm.id)
              }
            >
              {selectMode && (
                <div className="absolute right-3 top-3 text-muted-foreground">
                  {selected ? (
                    <CheckCircle2 className="size-5 text-destructive" />
                  ) : (
                    <Circle className="size-5" />
                  )}
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-10 items-center justify-center rounded-lg">
                      <Crown className="size-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{realm.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {system?.name ?? realm.systemId}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {realm.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {realm.description}
                  </p>
                </CardContent>
              )}
              {!selectMode && (
                <CardFooter className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditRealm(realm.id);
                    }}
                  >
                    <Pencil className="mr-2 size-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportRealm(realm.id);
                    }}
                  >
                    <Download className="mr-2 size-3" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(realm.id);
                    }}
                  >
                    <Trash2 className="mr-2 size-3" />
                    Delete
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Realm</DialogTitle>
            <DialogDescription>Update your realm's details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-realm-name">Name</Label>
              <Input
                id="edit-realm-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isSavingEdit}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-realm-desc">Description</Label>
              <Textarea
                id="edit-realm-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                disabled={isSavingEdit}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || isSavingEdit}
            >
              {isSavingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Realm"
        description="Are you sure you want to delete this realm? This action cannot be undone and will remove all associated data."
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteRealm}
      />

      <ConfirmDialog
        open={showBulkDelete}
        onOpenChange={(open) => !open && setShowBulkDelete(false)}
        title={`Delete ${selectedIds.size} Realm${selectedIds.size === 1 ? "" : "s"}`}
        description={`Are you sure you want to delete ${selectedIds.size} realm${selectedIds.size === 1 ? "" : "s"}? This action cannot be undone and will remove all associated data.`}
        confirmLabel={isBulkDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
