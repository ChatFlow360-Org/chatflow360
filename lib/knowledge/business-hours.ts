/**
 * Business Hours — Structured Knowledge Category
 *
 * Converts structured schedule data into natural-language text for RAG embedding.
 * Same pattern as promptStructure → systemPrompt (structured input, composed text output).
 */

import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export interface DaySchedule {
  open: boolean;
  openTime: string; // "HH:mm" 24h format
  closeTime: string; // "HH:mm" 24h format
}

export interface HolidayEntry {
  name: string; // e.g. "Christmas Day"
  date: string; // "MM-DD" e.g. "12-25"
  closed: boolean; // true = closed, false = open with custom hours
  openTime?: string; // only if closed === false
  closeTime?: string; // only if closed === false
}

export interface BusinessHoursData {
  schedule: Record<DayOfWeek, DaySchedule>;
  holidays: HolidayEntry[];
  timezone?: string; // e.g. "Eastern Time (ET)"
  notes?: string; // free-form note (max 500 chars)
}

// ─── Knowledge Categories ────────────────────────────────────────

export type KnowledgeCategory =
  | "free_text"
  | "business_hours"
  | "faqs"
  | "pricing"
  | "location_contact"
  | "policies";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "free_text",
  "business_hours",
  "faqs",
  "pricing",
  "location_contact",
  "policies",
];

// ─── Default schedule (Mon-Fri 9-5, Sat-Sun closed) ─────────────

export const DEFAULT_BUSINESS_HOURS: BusinessHoursData = {
  schedule: {
    monday: { open: true, openTime: "09:00", closeTime: "17:00" },
    tuesday: { open: true, openTime: "09:00", closeTime: "17:00" },
    wednesday: { open: true, openTime: "09:00", closeTime: "17:00" },
    thursday: { open: true, openTime: "09:00", closeTime: "17:00" },
    friday: { open: true, openTime: "09:00", closeTime: "17:00" },
    saturday: { open: false, openTime: "09:00", closeTime: "17:00" },
    sunday: { open: false, openTime: "09:00", closeTime: "17:00" },
  },
  holidays: [],
  timezone: "Eastern Time (ET)",
  notes: "",
};

// ─── US Holidays Presets ─────────────────────────────────────────

export interface HolidayPreset {
  name: string;
  nameEs: string;
  date: string; // MM-DD
}

export const US_HOLIDAY_PRESETS: HolidayPreset[] = [
  { name: "New Year's Day", nameEs: "Año Nuevo", date: "01-01" },
  { name: "Martin Luther King Jr. Day", nameEs: "Día de Martin Luther King Jr.", date: "01-20" },
  { name: "Presidents' Day", nameEs: "Día de los Presidentes", date: "02-17" },
  { name: "Memorial Day", nameEs: "Día de los Caídos", date: "05-26" },
  { name: "Independence Day", nameEs: "Día de la Independencia", date: "07-04" },
  { name: "Labor Day", nameEs: "Día del Trabajo", date: "09-01" },
  { name: "Columbus Day", nameEs: "Día de la Raza", date: "10-13" },
  { name: "Veterans Day", nameEs: "Día de los Veteranos", date: "11-11" },
  { name: "Thanksgiving", nameEs: "Día de Acción de Gracias", date: "11-27" },
  { name: "Christmas Day", nameEs: "Navidad", date: "12-25" },
];

// ─── Zod Validation ──────────────────────────────────────────────

const dayScheduleSchema = z.object({
  open: z.boolean(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const holidaySchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().regex(/^\d{2}-\d{2}$/),
  closed: z.boolean(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export const businessHoursSchema = z.object({
  schedule: z.object({
    monday: dayScheduleSchema,
    tuesday: dayScheduleSchema,
    wednesday: dayScheduleSchema,
    thursday: dayScheduleSchema,
    friday: dayScheduleSchema,
    saturday: dayScheduleSchema,
    sunday: dayScheduleSchema,
  }),
  holidays: z.array(holidaySchema).max(20),
  timezone: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

// ─── Composer: Structured → Text ─────────────────────────────────

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

/**
 * Compose business hours structured data into natural language text for RAG.
 * Output is bilingual (EN/ES) so the AI can answer in either language.
 */
export function composeBusinessHoursText(data: BusinessHoursData): string {
  const sections: string[] = [];

  // Regular schedule
  sections.push("BUSINESS HOURS / HORARIO DE ATENCIÓN:");

  for (const day of DAYS_OF_WEEK) {
    const sched = data.schedule[day];
    const label = DAY_LABELS[day];
    if (sched.open) {
      sections.push(
        `- ${label}: ${formatTime12h(sched.openTime)} - ${formatTime12h(sched.closeTime)}`
      );
    } else {
      sections.push(`- ${label}: Closed / Cerrado`);
    }
  }

  // Timezone
  if (data.timezone) {
    sections.push(`\nTimezone / Zona horaria: ${data.timezone}`);
  }

  // Holidays
  if (data.holidays.length > 0) {
    sections.push("\nHOLIDAYS / DÍAS FESTIVOS:");
    for (const h of data.holidays) {
      if (h.closed) {
        sections.push(`- ${h.name}: Closed / Cerrado`);
      } else if (h.openTime && h.closeTime) {
        sections.push(
          `- ${h.name}: ${formatTime12h(h.openTime)} - ${formatTime12h(h.closeTime)}`
        );
      }
    }
  }

  // Notes
  if (data.notes?.trim()) {
    sections.push(`\nAdditional notes / Notas adicionales: ${data.notes.trim()}`);
  }

  return sections.join("\n");
}
