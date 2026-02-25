"use client";

import { useState, useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  ChevronRight,
  ChevronDown,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  createChannel,
  updateChannel,
  deleteChannel,
  type AdminActionState,
} from "@/lib/admin/actions";

interface SerializedChannel {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

interface SerializedOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  membersCount: number;
  maxChannels: number;
  channels: SerializedChannel[];
  createdAt: string;
}

interface OrganizationsClientProps {
  organizations: SerializedOrg[];
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OrganizationsClient({ organizations }: OrganizationsClientProps) {
  const t = useTranslations("organizations");
  const tc = useTranslations("common");
  const te = useTranslations("admin");
  const tch = useTranslations("channels");
  const locale = useLocale();

  // Org dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<SerializedOrg | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [slugValue, setSlugValue] = useState("");
  const [planValue, setPlanValue] = useState("starter");

  // Delete confirmation state
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null);
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);

  // Expandable rows
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

  // Channel dialog state
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<SerializedChannel | null>(null);
  const [channelOrgId, setChannelOrgId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelIsActive, setChannelIsActive] = useState("true");

  // Org actions
  const [createState, createAction, isCreating] = useActionState<AdminActionState, FormData>(
    createOrganization,
    null
  );
  const [updateState, updateAction, isUpdating] = useActionState<AdminActionState, FormData>(
    updateOrganization,
    null
  );

  // Channel actions
  const [createChState, createChAction, isCreatingCh] = useActionState<AdminActionState, FormData>(
    createChannel,
    null
  );
  const [updateChState, updateChAction, isUpdatingCh] = useActionState<AdminActionState, FormData>(
    updateChannel,
    null
  );

  // Close org dialog on success
  useEffect(() => {
    if (createState?.success || updateState?.success) {
      setDialogOpen(false);
      setEditingOrg(null);
    }
  }, [createState?.success, updateState?.success]);

  // Close channel dialog on success
  useEffect(() => {
    if (createChState?.success || updateChState?.success) {
      setChannelDialogOpen(false);
      setEditingChannel(null);
    }
  }, [createChState?.success, updateChState?.success]);

  // Org dialog helpers
  const openCreate = () => {
    setEditingOrg(null);
    setNameValue("");
    setSlugValue("");
    setPlanValue("starter");
    setDialogOpen(true);
  };

  const openEdit = (org: SerializedOrg) => {
    setEditingOrg(org);
    setNameValue(org.name);
    setSlugValue(org.slug);
    setPlanValue(org.plan);
    setDialogOpen(true);
  };

  const handleNameChange = (val: string) => {
    setNameValue(val);
    if (!editingOrg) {
      setSlugValue(slugify(val));
    }
  };

  const handleDelete = (id: string) => {
    setDeleteOrgId(id);
  };

  const confirmDeleteOrg = async () => {
    if (!deleteOrgId) return;
    await deleteOrganization(deleteOrgId);
    setDeleteOrgId(null);
  };

  // Channel dialog helpers
  const openCreateChannel = (orgId: string) => {
    setEditingChannel(null);
    setChannelOrgId(orgId);
    setChannelName("");
    setChannelIsActive("true");
    setChannelDialogOpen(true);
  };

  const openEditChannel = (channel: SerializedChannel, orgId: string) => {
    setEditingChannel(channel);
    setChannelOrgId(orgId);
    setChannelName(channel.name);
    setChannelIsActive(channel.isActive ? "true" : "false");
    setChannelDialogOpen(true);
  };

  const handleDeleteChannel = (id: string) => {
    setDeleteChannelId(id);
  };

  const confirmDeleteChannel = async () => {
    if (!deleteChannelId) return;
    await deleteChannel(deleteChannelId);
    setDeleteChannelId(null);
  };

  const toggleExpand = (orgId: string) => {
    setExpandedOrgId(expandedOrgId === orgId ? null : orgId);
  };

  const orgActionState = editingOrg ? updateState : createState;
  const orgIsPending = editingOrg ? isUpdating : isCreating;

  const chActionState = editingChannel ? updateChState : createChState;
  const chIsPending = editingChannel ? isUpdatingCh : isCreatingCh;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate} className="cursor-pointer bg-cta text-white hover:bg-cta/90">
          <Plus className="mr-2 h-4 w-4" />
          {t("newOrganization")}
        </Button>
      </div>

      {/* Table */}
      {organizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t("noOrganizations")}</p>
          <p className="text-xs text-muted-foreground/60">{t("createFirst")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("name")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">{t("slug")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("plan")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">{t("status")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{tch("title")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t("members")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t("created")}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{tc("edit")}</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org, i) => {
                const isExpanded = expandedOrgId === org.id;
                return (
                  <OrgRow
                    key={org.id}
                    org={org}
                    index={i}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(org.id)}
                    onEdit={() => openEdit(org)}
                    onDelete={() => handleDelete(org.id)}
                    onCreateChannel={() => openCreateChannel(org.id)}
                    onEditChannel={(ch) => openEditChannel(ch, org.id)}
                    onDeleteChannel={(chId) => handleDeleteChannel(chId)}
                    locale={locale}
                    t={t}
                    tc={tc}
                    tch={tch}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Org Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOrg ? t("editOrganization") : t("newOrganization")}
            </DialogTitle>
          </DialogHeader>

          {orgActionState?.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {te(`errors.${orgActionState.error}`)}
            </div>
          )}

          <form action={editingOrg ? updateAction : createAction} className="space-y-4">
            {editingOrg && <input type="hidden" name="id" value={editingOrg.id} />}

            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                name="name"
                value={nameValue}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Miami Dental Care"
                required
                maxLength={100}
                autoComplete="off"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">{t("slug")}</Label>
              <Input
                id="slug"
                name="slug"
                value={slugValue}
                onChange={(e) => setSlugValue(e.target.value)}
                placeholder="miami-dental-care"
                required
                maxLength={100}
                pattern="[a-z0-9-]+"
                autoComplete="off"
                className="bg-background font-mono text-sm"
                disabled={!!editingOrg}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">{t("plan")}</Label>
              <Select name="plan" value={planValue} onValueChange={setPlanValue}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">{t("plans.starter")}</SelectItem>
                  <SelectItem value="pro">{t("plans.pro")}</SelectItem>
                  <SelectItem value="growth">{t("plans.growth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editingOrg && (
              <div className="space-y-2">
                <Label htmlFor="isActive">{t("status")}</Label>
                <Select
                  name="isActive"
                  defaultValue={editingOrg.isActive ? "true" : "false"}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("active")}</SelectItem>
                    <SelectItem value="false">{t("inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="cursor-pointer"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={orgIsPending}
                className="cursor-pointer bg-cta text-white hover:bg-cta/90"
              >
                {orgIsPending ? "..." : editingOrg ? tc("save") : tc("add")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Channel Dialog */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? tch("editChannel") : tch("newChannel")}
            </DialogTitle>
          </DialogHeader>

          {chActionState?.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {te(`errors.${chActionState.error}`)}
            </div>
          )}

          <form action={editingChannel ? updateChAction : createChAction} className="space-y-4">
            {editingChannel && <input type="hidden" name="id" value={editingChannel.id} />}
            <input type="hidden" name="organizationId" value={channelOrgId} />
            <input type="hidden" name="type" value="website" />

            <div className="space-y-2">
              <Label htmlFor="channelName">{tch("channelName")}</Label>
              <Input
                id="channelName"
                name="name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={tch("namePlaceholder")}
                required
                maxLength={100}
                autoComplete="off"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>{tch("type")}</Label>
              <Input
                value={tch("types.website")}
                disabled
                className="bg-muted/50"
              />
            </div>

            {editingChannel && (
              <div className="space-y-2">
                <Label htmlFor="channelIsActive">{t("status")}</Label>
                <Select
                  name="isActive"
                  value={channelIsActive}
                  onValueChange={setChannelIsActive}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("active")}</SelectItem>
                    <SelectItem value="false">{t("inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChannelDialogOpen(false)}
                className="cursor-pointer"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={chIsPending}
                className="cursor-pointer bg-cta text-white hover:bg-cta/90"
              >
                {chIsPending ? "..." : editingChannel ? tc("save") : tc("add")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Org Confirmation ── */}
      <ConfirmDialog
        open={!!deleteOrgId}
        onConfirm={confirmDeleteOrg}
        onCancel={() => setDeleteOrgId(null)}
        title={t("deleteConfirm")}
        description={t("deleteConfirmDescription")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        variant="destructive"
      />

      {/* ── Delete Channel Confirmation ── */}
      <ConfirmDialog
        open={!!deleteChannelId}
        onConfirm={confirmDeleteChannel}
        onCancel={() => setDeleteChannelId(null)}
        title={tch("deleteConfirm")}
        description={tch("deleteConfirmDescription")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        variant="destructive"
      />
    </div>
  );
}

// ============================================
// Org Row with expandable channels
// ============================================

interface OrgRowProps {
  org: SerializedOrg;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateChannel: () => void;
  onEditChannel: (ch: SerializedChannel) => void;
  onDeleteChannel: (id: string) => void;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  tch: ReturnType<typeof useTranslations>;
}

function OrgRow({
  org,
  index,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  locale,
  t,
  tc,
  tch,
}: OrgRowProps) {
  const atLimit = org.channels.length >= org.maxChannels;

  return (
    <>
      <tr className={index % 2 === 0 ? "bg-muted/60" : ""}>
        <td className="px-2 py-3">
          <button
            onClick={onToggle}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 font-medium text-foreground">{org.name}</td>
        <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">{org.slug}</td>
        <td className="px-4 py-3">
          <Badge variant="outline" className="text-xs capitalize">
            {t(`plans.${org.plan}`)}
          </Badge>
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          <Badge
            variant={org.isActive ? "default" : "secondary"}
            className={org.isActive ? "bg-cta/15 text-cta" : ""}
          >
            {org.isActive ? t("active") : t("inactive")}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={onToggle}
            className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {tch("channelsCount", { count: org.channels.length, max: org.maxChannels })}
          </button>
        </td>
        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{org.membersCount}</td>
        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
          {new Date(org.createdAt).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded: Channels sub-table */}
      {isExpanded && (
        <tr>
          <td colSpan={9} className="border-t border-border/50 bg-muted/30 px-4 py-4">
            <div className="ml-6 rounded-lg border border-border bg-card p-4">
              {/* Channels header */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {tch("title")} ({org.channels.length}/{org.maxChannels})
                </h3>
                <Button
                  size="sm"
                  onClick={onCreateChannel}
                  disabled={atLimit}
                  className="h-7 cursor-pointer bg-cta text-xs text-white hover:bg-cta/90 disabled:opacity-50"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {tch("newChannel")}
                </Button>
              </div>

              {atLimit && (
                <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">
                  {tch("limitReached")}
                </p>
              )}

              {org.channels.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Globe className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{tch("noChannels")}</p>
                  <p className="text-xs text-muted-foreground/60">{tch("addFirst")}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-2 text-left text-xs font-medium text-muted-foreground">{tch("channelName")}</th>
                      <th className="pb-2 text-left text-xs font-medium text-muted-foreground">{tch("type")}</th>
                      <th className="pb-2 text-left text-xs font-medium text-muted-foreground">{t("status")}</th>
                      <th className="pb-2 text-right text-xs font-medium text-muted-foreground">{tc("edit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org.channels.map((ch) => (
                      <tr key={ch.id} className="border-b border-border/30 last:border-0">
                        <td className="py-2 font-medium text-foreground">{ch.name}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            <Globe className="mr-1 h-3 w-3" />
                            {tch(`types.${ch.type}`)}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={ch.isActive ? "default" : "secondary"}
                            className={ch.isActive ? "bg-cta/15 text-cta" : ""}
                          >
                            {ch.isActive ? t("active") : t("inactive")}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 cursor-pointer"
                              onClick={() => onEditChannel(ch)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive"
                              onClick={() => onDeleteChannel(ch.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
