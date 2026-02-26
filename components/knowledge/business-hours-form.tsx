"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, Plus, X, ChevronDown, ChevronUp, Clock } from "lucide-react";

import type {
  BusinessHoursData,
  DayOfWeek,
  HolidayEntry,
} from "@/lib/knowledge/business-hours";
import {
  DAYS_OF_WEEK,
  US_HOLIDAY_PRESETS,
} from "@/lib/knowledge/business-hours";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────────────

const TIMEZONES = [
  { value: "Eastern Time (ET)", label: "Eastern (ET)" },
  { value: "Central Time (CT)", label: "Central (CT)" },
  { value: "Mountain Time (MT)", label: "Mountain (MT)" },
  { value: "Pacific Time (PT)", label: "Pacific (PT)" },
] as const;

/** Tuesday through Friday -- used by "Copy Monday" action. */
const WEEKDAYS_TUE_FRI: DayOfWeek[] = [
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

// ─── Props ───────────────────────────────────────────────────────

interface BusinessHoursFormProps {
  data: BusinessHoursData;
  onChange: (data: BusinessHoursData) => void;
  locale: string;
  t: (key: string, values?: Record<string, unknown>) => string;
}

// ─── Main Component ──────────────────────────────────────────────

export function BusinessHoursForm({
  data,
  onChange,
  locale,
  t,
}: BusinessHoursFormProps) {
  const [holidaysOpen, setHolidaysOpen] = useState(data.holidays.length > 0);

  // ─── Day schedule helpers ──────────────────────────────────────

  const updateDay = useCallback(
    (day: DayOfWeek, patch: Partial<BusinessHoursData["schedule"][DayOfWeek]>) => {
      onChange({
        ...data,
        schedule: {
          ...data.schedule,
          [day]: { ...data.schedule[day], ...patch },
        },
      });
    },
    [data, onChange],
  );

  const copyMondayToWeekdays = useCallback(() => {
    const monday = data.schedule.monday;
    const updated = { ...data.schedule };
    for (const day of WEEKDAYS_TUE_FRI) {
      updated[day] = { ...monday };
    }
    onChange({ ...data, schedule: updated });
  }, [data, onChange]);

  // ─── Holiday helpers ───────────────────────────────────────────

  const addHoliday = useCallback(
    (entry: HolidayEntry) => {
      onChange({ ...data, holidays: [...data.holidays, entry] });
      if (!holidaysOpen) setHolidaysOpen(true);
    },
    [data, onChange, holidaysOpen],
  );

  const updateHoliday = useCallback(
    (index: number, patch: Partial<HolidayEntry>) => {
      const updated = data.holidays.map((h, i) =>
        i === index ? { ...h, ...patch } : h,
      );
      onChange({ ...data, holidays: updated });
    },
    [data, onChange],
  );

  const removeHoliday = useCallback(
    (index: number) => {
      onChange({
        ...data,
        holidays: data.holidays.filter((_, i) => i !== index),
      });
    },
    [data, onChange],
  );

  const addPresetHoliday = useCallback(
    (preset: (typeof US_HOLIDAY_PRESETS)[number]) => {
      const alreadyExists = data.holidays.some((h) => h.date === preset.date);
      if (alreadyExists) return;

      const name = locale === "es" ? preset.nameEs : preset.name;
      addHoliday({ name, date: preset.date, closed: true });
    },
    [data.holidays, locale, addHoliday],
  );

  // ─── Derived values ────────────────────────────────────────────

  const availablePresets = useMemo(
    () =>
      US_HOLIDAY_PRESETS.filter(
        (p) => !data.holidays.some((h) => h.date === p.date),
      ),
    [data.holidays],
  );

  const mondayIsOpen = data.schedule.monday.open;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Weekly Schedule ──────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">{t("weeklySchedule")}</Label>
        </div>

        <div className="space-y-2 pt-2">
          {DAYS_OF_WEEK.map((day) => (
            <DayRow
              key={day}
              schedule={data.schedule[day]}
              label={t(day)}
              onToggle={(open) => updateDay(day, { open })}
              onOpenTimeChange={(openTime) => updateDay(day, { openTime })}
              onCloseTimeChange={(closeTime) => updateDay(day, { closeTime })}
            />
          ))}
        </div>

        {mondayIsOpen && (
          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={copyMondayToWeekdays}
            >
              <Copy />
              {t("copyToWeekdays")}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Timezone ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="bh-timezone" className="text-sm font-semibold">
          {t("timezone")}
        </Label>
        <Select
          value={data.timezone ?? "Eastern Time (ET)"}
          onValueChange={(value) => onChange({ ...data, timezone: value })}
        >
          <SelectTrigger
            id="bh-timezone"
            className="w-full dark:border-muted-foreground/20 dark:bg-muted/30"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* ── Holidays ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setHolidaysOpen((prev) => !prev)}
        >
          <Label className="text-sm font-semibold pointer-events-none">
            {t("holidays")}
            {data.holidays.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {data.holidays.length}
              </Badge>
            )}
          </Label>
          {holidaysOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {holidaysOpen && (
          <div className="space-y-3">
            {data.holidays.map((holiday, index) => (
              <HolidayRow
                key={`${holiday.date}-${index}`}
                holiday={holiday}
                t={t}
                onUpdate={(patch) => updateHoliday(index, patch)}
                onRemove={() => removeHoliday(index)}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                addHoliday({ name: "", date: "", closed: true })
              }
            >
              <Plus />
              {t("addHoliday")}
            </Button>

            {availablePresets.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-normal">
                  {t("quickAdd")}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {availablePresets.map((preset) => (
                    <Badge
                      key={preset.date}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => addPresetHoliday(preset)}
                    >
                      <Plus className="size-3 mr-0.5" />
                      {locale === "es" ? preset.nameEs : preset.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* ── Notes ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="bh-notes" className="text-sm font-semibold">
          {t("notes")}
        </Label>
        <Textarea
          id="bh-notes"
          rows={2}
          maxLength={500}
          placeholder={t("notesPlaceholder")}
          className="min-h-0 dark:border-muted-foreground/20 dark:bg-muted/30"
          value={data.notes ?? ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
        <p className="text-xs text-muted-foreground text-right">
          {(data.notes?.length ?? 0)}/500
        </p>
      </div>
    </div>
  );
}

// ─── DayRow ────────────────────────────────────────────────────────

interface DayRowProps {
  schedule: BusinessHoursData["schedule"][DayOfWeek];
  label: string;
  onToggle: (open: boolean) => void;
  onOpenTimeChange: (time: string) => void;
  onCloseTimeChange: (time: string) => void;
}

function DayRow({
  schedule,
  label,
  onToggle,
  onOpenTimeChange,
  onCloseTimeChange,
}: DayRowProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      {/* Day label + toggle */}
      <div className="flex items-center gap-2 min-w-0">
        <Switch
          size="sm"
          checked={schedule.open}
          onCheckedChange={onToggle}
          aria-label={`${label} open/closed`}
        />
        <span
          className={`text-sm truncate ${
            schedule.open
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Visual spacer */}
      <span className="text-muted-foreground text-xs select-none">
        {schedule.open ? "" : ""}
      </span>

      {/* Time inputs or Closed label */}
      <div className="flex items-center gap-1.5">
        {schedule.open ? (
          <>
            <Input
              type="time"
              value={schedule.openTime}
              onChange={(e) => onOpenTimeChange(e.target.value)}
              className="h-8 w-[5.5rem] text-xs px-2 dark:border-muted-foreground/20 dark:bg-muted/30"
              aria-label={`${label} open time`}
            />
            <span className="text-muted-foreground text-xs select-none">-</span>
            <Input
              type="time"
              value={schedule.closeTime}
              onChange={(e) => onCloseTimeChange(e.target.value)}
              className="h-8 w-[5.5rem] text-xs px-2 dark:border-muted-foreground/20 dark:bg-muted/30"
              aria-label={`${label} close time`}
            />
          </>
        ) : (
          <span className="text-sm text-muted-foreground italic pl-1 select-none">
            --:-- - --:--
          </span>
        )}
      </div>
    </div>
  );
}

// ─── HolidayRow ────────────────────────────────────────────────────

interface HolidayRowProps {
  holiday: HolidayEntry;
  t: (key: string, values?: Record<string, unknown>) => string;
  onUpdate: (patch: Partial<HolidayEntry>) => void;
  onRemove: () => void;
}

function HolidayRow({ holiday, t, onUpdate, onRemove }: HolidayRowProps) {
  return (
    <div className="rounded-md border border-border p-3 space-y-2 dark:border-muted-foreground/20">
      {/* Top row: name + date + remove */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("holidayName")}
          value={holiday.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="h-8 text-sm flex-1 min-w-0 dark:border-muted-foreground/20 dark:bg-muted/30"
          aria-label={t("holidayName")}
        />
        <Input
          type="text"
          placeholder="MM-DD"
          value={holiday.date}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9-]/g, "").slice(0, 5);
            onUpdate({ date: val });
          }}
          className="h-8 w-20 text-sm text-center dark:border-muted-foreground/20 dark:bg-muted/30"
          aria-label={t("holidayDate")}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={onRemove}
          aria-label={t("removeHoliday")}
        >
          <X />
        </Button>
      </div>

      {/* Bottom row: open/closed toggle + optional time inputs */}
      <div className="flex items-center gap-2">
        <Switch
          size="sm"
          checked={!holiday.closed}
          onCheckedChange={(open) => {
            if (open) {
              onUpdate({ closed: false, openTime: "09:00", closeTime: "17:00" });
            } else {
              onUpdate({ closed: true, openTime: undefined, closeTime: undefined });
            }
          }}
          aria-label={t("holidayOpenToggle")}
        />
        <span className="text-xs text-muted-foreground">
          {holiday.closed ? t("closed") : t("openWithHours")}
        </span>

        {!holiday.closed && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Input
              type="time"
              value={holiday.openTime ?? "09:00"}
              onChange={(e) => onUpdate({ openTime: e.target.value })}
              className="h-7 w-[5rem] text-xs px-1.5 dark:border-muted-foreground/20 dark:bg-muted/30"
              aria-label={t("holidayOpenTime")}
            />
            <span className="text-muted-foreground text-xs select-none">-</span>
            <Input
              type="time"
              value={holiday.closeTime ?? "17:00"}
              onChange={(e) => onUpdate({ closeTime: e.target.value })}
              className="h-7 w-[5rem] text-xs px-1.5 dark:border-muted-foreground/20 dark:bg-muted/30"
              aria-label={t("holidayCloseTime")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
