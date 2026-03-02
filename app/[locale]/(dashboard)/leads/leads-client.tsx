"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { normalizeAmPm } from "@/lib/utils/format";
import { deleteLead } from "./actions";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ip: string | null;
  pageUrl: string | null;
  createdAt: string;
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function LeadsClient({ leads: initialLeads }: { leads: Lead[] }) {
  const t = useTranslations("leads");
  const [leads, setLeads] = useState(initialLeads);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!deleteId) return;
    const id = deleteId;
    startTransition(async () => {
      const result = await deleteLead(id);
      if (result.success) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      }
      setDeleteId(null);
    });
  };

  const formatDate = (iso: string) => {
    return normalizeAmPm(
      new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">{t("noLeads")}</p>
          <p className="text-xs text-muted-foreground/60">
            {t("noLeadsHint")}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("count", { count: leads.length })}
          </p>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("name")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("email")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("phone")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("captureDate")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("ip")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t("referralPage")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.phone || "\u2014"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {lead.ip || "\u2014"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                      {lead.pageUrl ? (
                        <span
                          className="flex items-center gap-1"
                          title={lead.pageUrl}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {safePathname(lead.pageUrl)}
                          </span>
                        </span>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(lead.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="space-y-2 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(lead.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {lead.phone && (
                  <p className="text-sm text-muted-foreground">{lead.phone}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                  <span>{formatDate(lead.createdAt)}</span>
                  {lead.ip && <span className="font-mono">{lead.ip}</span>}
                </div>
                {lead.pageUrl && (
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground/70">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {safePathname(lead.pageUrl)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription")}
        onConfirm={handleDelete}
        loading={isPending}
        variant="destructive"
      />
    </div>
  );
}
