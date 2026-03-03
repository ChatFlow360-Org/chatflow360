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
  { value: "Eastern Standard Time (EST)", label: "Eastern Standard Time (EST)" },
  { value: "Central Standard Time (CST)", label: "Central Standard Time (CST)" },
  { value: "Mountain Standard Time (MST)", label: "Mountain Standard Time (MST)" },
  { value: "Pacific Standard Time (PST)", label: "Pacific Standard Time (PST)" },
] as const;

/** Tuesday through Friday -- used by "Copy Monday" action. */
const WEEKDAYS_TUE_FRI: DayOfWeek[] = [
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
] as const;

/** Days 1–31 as zero-padded strings. */
const DAYS_1_TO_31 = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

/** 12-hour time options every 15 minutes (value=24h "HH:mm", label=12h "H:MM AM/PM"). */
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${h12}:${String(m).padStart(2, "0")} ${period}`;
      opts.push({ value, label });
    }
  }
  return opts;
})();

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

  /** Show "Copy to Tue-Fri" only when Monday is open AND at least one weekday differs */
  const showCopyButton = useMemo(() => {
    if (!mondayIsOpen) return false;
    const mon = data.schedule.monday;
    return WEEKDAYS_TUE_FRI.some((day) => {
      const d = data.schedule[day];
      return d.open !== mon.open || d.openTime !== mon.openTime || d.closeTime !== mon.closeTime;
    });
  }, [data.schedule, mondayIsOpen]);

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
              shortLabel={t(`${day}Short`)}
              onToggle={(open) => updateDay(day, { open })}
              onOpenTimeChange={(openTime) => updateDay(day, { openTime })}
              onCloseTimeChange={(closeTime) => updateDay(day, { closeTime })}
            />
          ))}
        </div>

        {showCopyButton && (
          <div className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-cta/30 text-cta hover:bg-cta/10 hover:text-cta"
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
          value={data.timezone ?? "Eastern Standard Time (EST)"}
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
  shortLabel: string;
  onToggle: (open: boolean) => void;
  onOpenTimeChange: (time: string) => void;
  onCloseTimeChange: (time: string) => void;
}

function DayRow({
  schedule,
  label,
  shortLabel,
  onToggle,
  onOpenTimeChange,
  onCloseTimeChange,
}: DayRowProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Day label + toggle */}
      <div className="flex items-center gap-2 w-28 sm:w-32 shrink-0">
        <Switch
          size="sm"
          checked={schedule.open}
          onCheckedChange={onToggle}
          aria-label={`${label} open/closed`}
        />
        <span
          className={`text-sm ${
            schedule.open
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          }`}
        >
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
      </div>

      {/* Time selects or Closed label */}
      <div className="flex items-center gap-1.5 ml-auto">
        {schedule.open ? (
          <>
            <TimeSelect
              value={schedule.openTime}
              onChange={onOpenTimeChange}
              aria-label={`${label} open time`}
              className="h-8 w-26"
            />
            <span className="text-muted-foreground text-xs select-none">-</span>
            <TimeSelect
              value={schedule.closeTime}
              onChange={onCloseTimeChange}
              aria-label={`${label} close time`}
              className="h-8 w-26"
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
  // Parse "MM-DD" into separate month/day for the dropdowns
  const [month, day] = (holiday.date || "-").split("-");

  const handleMonthChange = (m: string) => {
    onUpdate({ date: `${m}-${day || "01"}` });
  };
  const handleDayChange = (d: string) => {
    onUpdate({ date: `${month || "01"}-${d}` });
  };

  return (
    <div className="rounded-md border border-border p-3 space-y-2 dark:border-muted-foreground/20">
      {/* Top row: name + remove  */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("holidayName")}
          value={holiday.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="h-8 text-sm flex-1 min-w-0 dark:border-muted-foreground/20 dark:bg-muted/30"
          aria-label={t("holidayName")}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive/70 hover:text-destructive shrink-0"
          onClick={onRemove}
          aria-label={t("removeHoliday")}
        >
          <X />
        </Button>
      </div>

      {/* Date row: month + day selects */}
      <div className="flex items-center gap-2">
        <Select value={month || ""} onValueChange={handleMonthChange}>
          <SelectTrigger
            className="h-8 w-22 text-xs dark:border-muted-foreground/20 dark:bg-muted/30"
            aria-label={t("holidayMonth")}
          >
            <SelectValue placeholder={t("month")} />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={day || ""} onValueChange={handleDayChange}>
          <SelectTrigger
            className="h-8 w-18 text-xs dark:border-muted-foreground/20 dark:bg-muted/30"
            aria-label={t("holidayDay")}
          >
            <SelectValue placeholder={t("day")} />
          </SelectTrigger>
          <SelectContent>
            {DAYS_1_TO_31.map((d) => (
              <SelectItem key={d} value={d} className="text-xs">
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <TimeSelect
              value={holiday.openTime ?? "09:00"}
              onChange={(v) => onUpdate({ openTime: v })}
              aria-label={t("holidayOpenTime")}
              className="h-7 w-26"
            />
            <span className="text-muted-foreground text-xs select-none">-</span>
            <TimeSelect
              value={holiday.closeTime ?? "17:00"}
              onChange={(v) => onUpdate({ closeTime: v })}
              aria-label={t("holidayCloseTime")}
              className="h-7 w-26"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TimeSelect (12h AM/PM dropdown) ──────────────────────────────

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}

/** Compact time select that displays 12h AM/PM labels but stores 24h HH:mm values. */
function TimeSelect({ value, onChange, className, ...props }: TimeSelectProps) {
  const current = TIME_OPTIONS.find((o) => o.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={`text-xs px-2 dark:border-muted-foreground/20 dark:bg-muted/30 ${className ?? ""}`}
        aria-label={props["aria-label"]}
      >
        <SelectValue>{current?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-52">
        {TIME_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
