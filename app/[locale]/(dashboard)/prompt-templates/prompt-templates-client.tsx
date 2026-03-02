"use client";

import { useState, useActionState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Bot,
  Shield,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createBusinessCategory,
  createPromptPiece,
  updatePromptPiece,
  deleteBusinessCategory,
  deletePromptPiece,
} from "@/lib/admin/actions";
import type { PieceType, PromptPieceData } from "@/lib/prompt-pieces";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryWithPieces {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  piecesCount: number;
  pieces: PromptPieceData[];
}

interface PromptTemplatesClientProps {
  categories: CategoryWithPieces[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PIECE_SECTIONS: { type: PieceType; icon: typeof Bot; colorClass: string }[] = [
  { type: "role", icon: Bot, colorClass: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { type: "rule", icon: Shield, colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { type: "personality", icon: Sparkles, colorClass: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromptTemplatesClient({ categories }: PromptTemplatesClientProps) {
  const t = useTranslations("promptTemplates");
  const tCommon = useTranslations("common");

  // --- Category state ---
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // --- Piece state ---
  const [showPieceDialog, setShowPieceDialog] = useState(false);
  const [pieceDialogType, setPieceDialogType] = useState<PieceType>("role");
  const [editingPiece, setEditingPiece] = useState<PromptPieceData | null>(null);
  const [pieceName, setPieceName] = useState("");
  const [pieceContent, setPieceContent] = useState("");

  // --- Delete state ---
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deletePieceId, setDeletePieceId] = useState<string | null>(null);

  // --- Server action states ---
  const [createCategoryState, createCategoryAction, isCreatingCategory] =
    useActionState(createBusinessCategory, null);
  const [createPieceState, createPieceAction, isCreatingPiece] =
    useActionState(createPromptPiece, null);
  const [updatePieceState, updatePieceAction, isUpdatingPiece] =
    useActionState(updatePromptPiece, null);
  const [isDeletingCategory, startDeleteCategoryTransition] = useTransition();
  const [isDeletingPiece, startDeletePieceTransition] = useTransition();

  // --- Feedback banner ---
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-dismiss banner after 4s
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  // Close category dialog on success
  useEffect(() => {
    if (createCategoryState?.success) {
      setShowNewCategoryDialog(false);
      resetCategoryForm();
      setBanner({ type: "success", message: t("categoryCreated") });
    } else if (createCategoryState?.error) {
      setBanner({ type: "error", message: createCategoryState.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createCategoryState]);

  // Close piece dialog on success
  useEffect(() => {
    if (createPieceState?.success) {
      setShowPieceDialog(false);
      resetPieceForm();
      setBanner({ type: "success", message: t("saved") });
    } else if (createPieceState?.error) {
      setBanner({ type: "error", message: createPieceState.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPieceState]);

  useEffect(() => {
    if (updatePieceState?.success) {
      setShowPieceDialog(false);
      resetPieceForm();
      setBanner({ type: "success", message: t("saved") });
    } else if (updatePieceState?.error) {
      setBanner({ type: "error", message: updatePieceState.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatePieceState]);

  // Sync selectedCategoryId with categories (if deleted, select first)
  useEffect(() => {
    if (selectedCategoryId && !categories.find((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]?.id ?? null);
    }
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // --- Helpers ---

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const resetCategoryForm = () => {
    setCategoryName("");
    setCategorySlug("");
    setSlugEdited(false);
  };

  const resetPieceForm = () => {
    setEditingPiece(null);
    setPieceName("");
    setPieceContent("");
  };

  const openNewCategory = () => {
    resetCategoryForm();
    setShowNewCategoryDialog(true);
  };

  const openNewPiece = (type: PieceType) => {
    resetPieceForm();
    setPieceDialogType(type);
    setShowPieceDialog(true);
  };

  const openEditPiece = (piece: PromptPieceData) => {
    setEditingPiece(piece);
    setPieceDialogType(piece.type);
    setPieceName(piece.name);
    setPieceContent(piece.content);
    setShowPieceDialog(true);
  };

  const handleCategoryNameChange = (value: string) => {
    setCategoryName(value);
    if (!slugEdited) {
      setCategorySlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setCategorySlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const confirmDeleteCategory = () => {
    if (!deleteCategoryId) return;
    startDeleteCategoryTransition(async () => {
      await deleteBusinessCategory(deleteCategoryId);
      setDeleteCategoryId(null);
      setBanner({ type: "success", message: t("categoryDeleted") });
    });
  };

  const confirmDeletePiece = () => {
    if (!deletePieceId) return;
    startDeletePieceTransition(async () => {
      await deletePromptPiece(deletePieceId);
      setDeletePieceId(null);
      setBanner({ type: "success", message: t("saved") });
    });
  };

  const sectionLabel = (type: PieceType): string => {
    const map: Record<PieceType, string> = {
      role: t("sectionRoles"),
      rule: t("sectionRules"),
      personality: t("sectionPersonalities"),
    };
    return map[type];
  };

  const addLabel = (type: PieceType): string => {
    const map: Record<PieceType, string> = {
      role: t("addRole"),
      rule: t("addRule"),
      personality: t("addPersonality"),
    };
    return map[type];
  };

  const textareaRows = (type: PieceType): number => {
    return type === "rule" ? 4 : 6;
  };

  // --- Render ---

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openNewCategory}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("newCategory")}
        </Button>
      </div>

      {/* Feedback banner */}
      {banner && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Main layout */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="mb-4 h-12 w-12 text-cta/40" />
            <h3 className="text-sm font-medium">{t("noCategories")}</h3>
            <Button className="mt-4" size="sm" onClick={openNewCategory}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("newCategory")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4">
          {/* Left sidebar - Categories */}
          <div className="min-w-[200px] space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`group flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  cat.id === selectedCategoryId
                    ? "border-cta/30 bg-cta/10 font-medium text-cta"
                    : "border-transparent bg-muted/40 text-foreground hover:bg-muted/70"
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px]"
                  >
                    {cat.piecesCount}
                  </Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCategoryId(cat.id);
                    }}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    disabled={isDeletingCategory}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            ))}
          </div>

          {/* Right panel - Pieces */}
          <div className="flex-1 min-w-0">
            {selectedCategory ? (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{selectedCategory.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {PIECE_SECTIONS.map(({ type, icon: Icon, colorClass }) => {
                    const pieces = selectedCategory.pieces.filter((p) => p.type === type);
                    return (
                      <div key={type}>
                        {/* Section header */}
                        <div className="mb-3 flex items-center gap-2">
                          <div className={`flex h-6 w-6 items-center justify-center rounded border ${colorClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <h3 className="text-sm font-semibold">{sectionLabel(type)}</h3>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {pieces.length}
                          </Badge>
                        </div>

                        {/* Pieces */}
                        {pieces.length > 0 ? (
                          <div className="space-y-2">
                            {pieces.map((piece) => (
                              <div
                                key={piece.id}
                                className="group/piece flex items-start gap-3 rounded-lg border bg-background px-3 py-2.5 transition-colors hover:border-cta/20"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">{piece.name}</p>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {piece.content}
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-cta"
                                    onClick={() => openEditPiece(piece)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeletePieceId(piece.id)}
                                    disabled={isDeletingPiece}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mb-2 text-xs text-muted-foreground/60">
                            {t("noPieces")}
                          </p>
                        )}

                        {/* Add button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => openNewPiece(type)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          {addLabel(type)}
                        </Button>

                        {/* Separator between sections (not after last) */}
                        {type !== "personality" && <Separator className="mt-5" />}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── New Category Dialog ── */}
      <Dialog
        open={showNewCategoryDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewCategoryDialog(false);
            resetCategoryForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newCategory")}</DialogTitle>
          </DialogHeader>
          <form action={createCategoryAction}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("categoryName")}</Label>
                <Input
                  name="name"
                  value={categoryName}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  placeholder="Healthcare"
                  maxLength={100}
                  required
                  autoComplete="off"
                  className="bg-background dark:border-muted-foreground/20 dark:bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("categorySlug")}</Label>
                <Input
                  name="slug"
                  value={categorySlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="healthcare"
                  maxLength={100}
                  required
                  autoComplete="off"
                  className="bg-background font-mono text-sm dark:border-muted-foreground/20 dark:bg-muted/30"
                />
                <p className="text-[10px] text-muted-foreground/70">
                  {t("categorySlugHint")}
                </p>
              </div>
              {createCategoryState?.error && (
                <p className="text-sm text-destructive">{createCategoryState.error}</p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewCategoryDialog(false);
                  resetCategoryForm();
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isCreatingCategory || !categoryName.trim() || !categorySlug.trim()}
              >
                {isCreatingCategory ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                {tCommon("add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create/Edit Piece Dialog ── */}
      <Dialog
        open={showPieceDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowPieceDialog(false);
            resetPieceForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPiece ? t("editPiece") : addLabel(pieceDialogType)}
            </DialogTitle>
          </DialogHeader>
          <form action={editingPiece ? updatePieceAction : createPieceAction}>
            {editingPiece && <input type="hidden" name="id" value={editingPiece.id} />}
            <input type="hidden" name="categoryId" value={selectedCategoryId ?? ""} />
            <input type="hidden" name="type" value={pieceDialogType} />
            <input type="hidden" name="sortOrder" value="0" />
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("pieceName")}</Label>
                <Input
                  name="name"
                  value={pieceName}
                  onChange={(e) => setPieceName(e.target.value)}
                  maxLength={100}
                  required
                  autoComplete="off"
                  className="bg-background dark:border-muted-foreground/20 dark:bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("pieceContent")}</Label>
                <Textarea
                  name="content"
                  value={pieceContent}
                  onChange={(e) => setPieceContent(e.target.value)}
                  rows={textareaRows(pieceDialogType)}
                  maxLength={2000}
                  required
                  className="resize-none bg-background dark:border-muted-foreground/20 dark:bg-muted/30"
                />
              </div>
              {(createPieceState?.error || updatePieceState?.error) && (
                <p className="text-sm text-destructive">
                  {createPieceState?.error || updatePieceState?.error}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPieceDialog(false);
                  resetPieceForm();
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  isCreatingPiece || isUpdatingPiece || !pieceName.trim() || !pieceContent.trim()
                }
              >
                {(isCreatingPiece || isUpdatingPiece) && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Category Confirmation ── */}
      <ConfirmDialog
        open={!!deleteCategoryId}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeleteCategoryId(null)}
        title={t("deleteCategory")}
        description={t("deleteCategoryConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        variant="destructive"
        loading={isDeletingCategory}
      />

      {/* ── Delete Piece Confirmation ── */}
      <ConfirmDialog
        open={!!deletePieceId}
        onConfirm={confirmDeletePiece}
        onCancel={() => setDeletePieceId(null)}
        title={t("deletePiece")}
        description={t("deletePieceConfirm")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        variant="destructive"
        loading={isDeletingPiece}
      />
    </div>
  );
}
