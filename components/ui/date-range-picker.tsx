"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const t = useTranslations("dateRange");
  const [open, setOpen] = useState(false);
  const selectingRangeRef = useRef(false);

  const activePreset = presets.find((p) => {
    if (!dateRange?.from || !dateRange?.to) return false;
    const expected = startOfDay(subDays(new Date(), p.days));
    return startOfDay(dateRange.from).getTime() === expected.getTime();
  });

  const handlePreset = (days: number) => {
    selectingRangeRef.current = false;
    onDateRangeChange({
      from: startOfDay(subDays(new Date(), days)),
      to: startOfDay(new Date()),
    });
  };

  const displayText = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : t("selectDates");

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && selectingRangeRef.current) return;
        if (!isOpen) selectingRangeRef.current = false;
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm transition-colors hover:bg-muted",
            open && "ring-2 ring-ring/20",
            className
          )}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
          <span className="font-medium text-foreground">{displayText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        {/* Presets */}
        <div className="flex items-center gap-1 border-b border-border px-3 py-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset.days)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activePreset?.days === preset.days
                  ? "bg-cta text-cta-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("custom")}
          </span>
        </div>
        {/* Calendar */}
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={(range, triggerDate) => {
            if (!selectingRangeRef.current) {
              // First click: start new range from the clicked date
              selectingRangeRef.current = true;
              onDateRangeChange({ from: triggerDate, to: undefined });
            } else {
              // Second click: complete range and close
              selectingRangeRef.current = false;
              const from = dateRange?.from ?? triggerDate;
              const to = triggerDate;
              // Ensure from < to
              const sorted = from <= to
                ? { from, to }
                : { from: to, to: from };
              onDateRangeChange(sorted);
              setOpen(false);
            }
          }}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
        />
      </PopoverContent>
    </Popover>
  );
}
