"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Users, Shield, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  createUser,
  updateUser,
  deleteUser,
  type AdminActionState,
} from "@/lib/admin/actions";

interface SerializedUser {
  id: string;
  email: string;
  fullName: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  membership: {
    organizationId: string;
    organizationName: string;
    role: string;
  } | null;
}

interface SimpleOrg {
  id: string;
  name: string;
}

interface UsersClientProps {
  users: SerializedUser[];
  organizations: SimpleOrg[];
}

export function UsersClient({ users, organizations }: UsersClientProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const te = useTranslations("admin");
  const locale = useLocale();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SerializedUser | null>(null);
  const [orgValue, setOrgValue] = useState("");
  const [roleValue, setRoleValue] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%&*_+-=";
    const all = upper + lower + digits + symbols;

    // Guarantee at least one of each type
    const required = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    const remaining = Array.from({ length: 12 }, () =>
      all[Math.floor(Math.random() * all.length)]
    );

    // Shuffle all characters together
    const password = [...required, ...remaining]
      .sort(() => Math.random() - 0.5)
      .join("");

    if (passwordRef.current) {
      // Set value via native setter to work with uncontrolled input
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      nativeSetter?.call(passwordRef.current, password);
      passwordRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setShowPassword(true);
  };

  const copyPassword = async () => {
    if (passwordRef.current?.value) {
      await navigator.clipboard.writeText(passwordRef.current.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [createState, createAction, isCreating] = useActionState<AdminActionState, FormData>(
    createUser,
    null
  );

  const [updateState, updateAction, isUpdating] = useActionState<AdminActionState, FormData>(
    updateUser,
    null
  );

  // Close dialog on success
  useEffect(() => {
    if (createState?.success || updateState?.success) {
      setDialogOpen(false);
      setEditingUser(null);
    }
  }, [createState?.success, updateState?.success]);

  const openCreate = () => {
    setEditingUser(null);
    setOrgValue("");
    setRoleValue("admin");
    setShowPassword(false);
    setCopied(false);
    setDialogOpen(true);
  };

  const openEdit = (user: SerializedUser) => {
    setEditingUser(user);
    setOrgValue(user.membership?.organizationId || "");
    setRoleValue(user.membership?.role || "admin");
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    await deleteUser(id);
  };

  const actionState = editingUser ? updateState : createState;
  const isPending = editingUser ? isUpdating : isCreating;

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

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
          {t("newUser")}
        </Button>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t("noUsers")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("fullName")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">{t("email")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("role")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">{t("organization")}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t("created")}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{tc("edit")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  className={i % 2 === 0 ? "bg-muted/60" : ""}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                          {getInitials(u.fullName, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {u.fullName || u.email}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.isSuperAdmin ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Shield className="mr-1 h-3 w-3" />
                        {t("superAdmin")}
                      </Badge>
                    ) : u.membership ? (
                      <Badge variant="outline" className="text-xs capitalize">
                        {t(`roles.${u.membership.role}`)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {u.membership?.organizationName || (
                      <span className="text-xs text-muted-foreground/60">{t("noOrganization")}</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {new Date(u.createdAt).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!u.isSuperAdmin && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
                          onClick={() => handleDelete(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
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
              {editingUser ? tc("edit") + " " + t("title").toLowerCase() : t("newUser")}
            </DialogTitle>
          </DialogHeader>

          {actionState?.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {te(`errors.${actionState.error}`)}
            </div>
          )}

          <form action={editingUser ? updateAction : createAction} className="space-y-4">
            {editingUser && <input type="hidden" name="id" value={editingUser.id} />}

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@company.com"
                  required
                  maxLength={254}
                  autoComplete="off"
                  className="bg-background"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={editingUser?.fullName || ""}
                placeholder="John Doe"
                required
                maxLength={100}
                className="bg-background"
              />
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("temporaryPassword")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 cursor-pointer gap-1 px-2 text-[11px] text-cta hover:text-cta/80"
                    onClick={generatePassword}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("generate")}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="bg-background pr-18"
                  />
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={copyPassword}
                      tabIndex={-1}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("passwordHint")}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="organizationId">{t("organization")}</Label>
              <Select
                name="organizationId"
                value={orgValue}
                onValueChange={setOrgValue}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t("selectOrganization")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noOrganization")}</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {orgValue && orgValue !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="role">{t("role")}</Label>
                <Select name="role" value={roleValue} onValueChange={setRoleValue}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t("selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                    <SelectItem value="agent">{t("roles.agent")}</SelectItem>
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
                {isPending ? "..." : editingUser ? tc("save") : tc("add")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
