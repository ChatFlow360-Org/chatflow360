"use client";

import { useState, useActionState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
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
  type AdminActionState,
} from "@/lib/admin/actions";

interface SerializedOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  membersCount: number;
  channelsCount: number;
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
  const locale = useLocale();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<SerializedOrg | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [slugValue, setSlugValue] = useState("");
  const [planValue, setPlanValue] = useState("starter");

  const [createState, createAction, isCreating] = useActionState<AdminActionState, FormData>(
    createOrganization,
    null
  );

  const [updateState, updateAction, isUpdating] = useActionState<AdminActionState, FormData>(
    updateOrganization,
    null
  );

  // Close dialog on success
  useEffect(() => {
    if (createState?.success || updateState?.success) {
      setDialogOpen(false);
      setEditingOrg(null);
    }
  }, [createState?.success, updateState?.success]);

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

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    await deleteOrganization(id);
  };

  const actionState = editingOrg ? updateState : createState;
  const isPending = editingOrg ? isUpdating : isCreating;

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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("name")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">{t("slug")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("plan")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">{t("status")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t("members")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t("created")}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{tc("edit")}</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org, i) => (
                <tr
                  key={org.id}
                  className={i % 2 === 0 ? "bg-muted/60" : ""}
                >
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
                        onClick={() => openEdit(org)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                        onClick={() => handleDelete(org.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOrg ? t("editOrganization") : t("newOrganization")}
            </DialogTitle>
          </DialogHeader>

          {actionState?.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {te(`errors.${actionState.error}`)}
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
                disabled={isPending}
                className="cursor-pointer bg-cta text-white hover:bg-cta/90"
              >
                {isPending ? "..." : editingOrg ? tc("save") : tc("add")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
