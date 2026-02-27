"use client";

import { useCallback, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Plus, Trash2 } from "lucide-react";

import type {
  AdditionalLocation,
  LocationContactData,
  SocialMediaEntry,
} from "@/lib/knowledge/location-contact";
import { SOCIAL_PLATFORMS } from "@/lib/knowledge/location-contact";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────────────

const MAX_ADDITIONAL_LOCATIONS = 5;

// ─── Props ───────────────────────────────────────────────────────

interface LocationContactFormProps {
  data: LocationContactData;
  onChange: (data: LocationContactData) => void;
  t: (key: string, values?: Record<string, unknown>) => string;
}

// ─── Main Component ──────────────────────────────────────────────

export function LocationContactForm({
  data,
  onChange,
  t,
}: LocationContactFormProps) {
  const [locationsOpen, setLocationsOpen] = useState(
    data.additionalLocations.length > 0,
  );

  // ─── Field helpers ────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof LocationContactData>(key: K, value: LocationContactData[K]) => {
      onChange({ ...data, [key]: value });
    },
    [data, onChange],
  );

  // ─── Social media helpers ─────────────────────────────────────

  const addSocialMedia = useCallback(() => {
    onChange({
      ...data,
      socialMedia: [...data.socialMedia, { platform: "", url: "" }],
    });
  }, [data, onChange]);

  const updateSocialMedia = useCallback(
    (index: number, patch: Partial<SocialMediaEntry>) => {
      const updated = data.socialMedia.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      );
      onChange({ ...data, socialMedia: updated });
    },
    [data, onChange],
  );

  const removeSocialMedia = useCallback(
    (index: number) => {
      onChange({
        ...data,
        socialMedia: data.socialMedia.filter((_, i) => i !== index),
      });
    },
    [data, onChange],
  );

  // ─── Additional location helpers ──────────────────────────────

  const addLocation = useCallback(() => {
    if (data.additionalLocations.length >= MAX_ADDITIONAL_LOCATIONS) return;
    onChange({
      ...data,
      additionalLocations: [
        ...data.additionalLocations,
        { name: "", address: "", phone: "" },
      ],
    });
    if (!locationsOpen) setLocationsOpen(true);
  }, [data, onChange, locationsOpen]);

  const updateLocation = useCallback(
    (index: number, patch: Partial<AdditionalLocation>) => {
      const updated = data.additionalLocations.map((loc, i) =>
        i === index ? { ...loc, ...patch } : loc,
      );
      onChange({ ...data, additionalLocations: updated });
    },
    [data, onChange],
  );

  const removeLocation = useCallback(
    (index: number) => {
      onChange({
        ...data,
        additionalLocations: data.additionalLocations.filter(
          (_, i) => i !== index,
        ),
      });
    },
    [data, onChange],
  );

  // ─── Derived ──────────────────────────────────────────────────

  /** Platforms already selected (to filter out from dropdown options) */
  const usedPlatforms = new Set(
    data.socialMedia.map((s) => s.platform).filter(Boolean),
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Primary Address ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-cta" />
          <Label className="text-sm font-semibold">
            {t("address")}
          </Label>
        </div>

        {/* Full-width address */}
        <div>
          <Input
            placeholder={t("addressPlaceholder")}
            value={data.address ?? ""}
            onChange={(e) => updateField("address", e.target.value)}
            className="dark:border-muted-foreground/20 dark:bg-muted/30"
            aria-label={t("address")}
          />
        </div>

        {/* City + State + Zip */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="lc-city" className="text-xs text-muted-foreground">
              {t("city")}
            </Label>
            <Input
              id="lc-city"
              placeholder={t("cityPlaceholder")}
              value={data.city ?? ""}
              onChange={(e) => updateField("city", e.target.value)}
              className="dark:border-muted-foreground/20 dark:bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lc-state" className="text-xs text-muted-foreground">
              {t("state")}
            </Label>
            <Input
              id="lc-state"
              placeholder={t("statePlaceholder")}
              value={data.state ?? ""}
              onChange={(e) => updateField("state", e.target.value)}
              className="dark:border-muted-foreground/20 dark:bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lc-zip" className="text-xs text-muted-foreground">
              {t("zipCode")}
            </Label>
            <Input
              id="lc-zip"
              placeholder={t("zipCodePlaceholder")}
              value={data.zipCode ?? ""}
              onChange={(e) => updateField("zipCode", e.target.value)}
              className="dark:border-muted-foreground/20 dark:bg-muted/30"
            />
          </div>
        </div>
      </div>

      {/* ── Contact ─────────────────────────────────────────── */}
      <div className="space-y-3 border-t pt-4 mt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lc-phone" className="text-xs text-muted-foreground">
              {t("phone")}
            </Label>
            <Input
              id="lc-phone"
              type="tel"
              placeholder={t("phonePlaceholder")}
              value={data.phone ?? ""}
              onChange={(e) => updateField("phone", e.target.value)}
              className="dark:border-muted-foreground/20 dark:bg-muted/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lc-email" className="text-xs text-muted-foreground">
              {t("email")}
            </Label>
            <Input
              id="lc-email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={data.email ?? ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="dark:border-muted-foreground/20 dark:bg-muted/30"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lc-website" className="text-xs text-muted-foreground">
            {t("website")}
          </Label>
          <Input
            id="lc-website"
            type="url"
            placeholder={t("websitePlaceholder")}
            value={data.website ?? ""}
            onChange={(e) => updateField("website", e.target.value)}
            className="dark:border-muted-foreground/20 dark:bg-muted/30"
          />
        </div>
      </div>

      {/* ── Social Media ────────────────────────────────────── */}
      <div className="space-y-3 border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t("socialMedia")}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSocialMedia}
          >
            <Plus />
            {t("addSocialMedia")}
          </Button>
        </div>

        {data.socialMedia.length > 0 && (
          <div className="space-y-2">
            {data.socialMedia.map((entry, index) => (
              <SocialMediaRow
                key={`social-${index}`}
                entry={entry}
                usedPlatforms={usedPlatforms}
                t={t}
                onUpdate={(patch) => updateSocialMedia(index, patch)}
                onRemove={() => removeSocialMedia(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Additional Locations (collapsible) ──────────────── */}
      <div className="space-y-3 border-t pt-4 mt-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setLocationsOpen((prev) => !prev)}
        >
          <Label className="text-sm font-semibold pointer-events-none">
            {t("additionalLocations")}
            {data.additionalLocations.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {data.additionalLocations.length}
              </Badge>
            )}
          </Label>
          {locationsOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {locationsOpen && (
          <div className="space-y-3">
            {data.additionalLocations.map((location, index) => (
              <AdditionalLocationCard
                key={`loc-${index}`}
                location={location}
                t={t}
                onUpdate={(patch) => updateLocation(index, patch)}
                onRemove={() => removeLocation(index)}
              />
            ))}

            {data.additionalLocations.length < MAX_ADDITIONAL_LOCATIONS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLocation}
              >
                <Plus />
                {t("addLocation")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SocialMediaRow ──────────────────────────────────────────────

interface SocialMediaRowProps {
  entry: SocialMediaEntry;
  usedPlatforms: Set<string>;
  t: (key: string, values?: Record<string, unknown>) => string;
  onUpdate: (patch: Partial<SocialMediaEntry>) => void;
  onRemove: () => void;
}

function SocialMediaRow({
  entry,
  usedPlatforms,
  t,
  onUpdate,
  onRemove,
}: SocialMediaRowProps) {
  return (
    <div className="flex gap-2 items-start">
      <Select
        value={entry.platform}
        onValueChange={(value) => onUpdate({ platform: value })}
      >
        <SelectTrigger
          className="h-9 w-40 shrink-0 dark:border-muted-foreground/20 dark:bg-muted/30"
          aria-label={t("platform")}
        >
          <SelectValue placeholder={t("platform")} />
        </SelectTrigger>
        <SelectContent>
          {SOCIAL_PLATFORMS.map((platform) => (
            <SelectItem
              key={platform}
              value={platform}
              disabled={
                usedPlatforms.has(platform) && entry.platform !== platform
              }
            >
              {platform}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder={t("urlPlaceholder")}
        value={entry.url}
        onChange={(e) => onUpdate({ url: e.target.value })}
        className="flex-1 min-w-0 dark:border-muted-foreground/20 dark:bg-muted/30"
        aria-label={t("url")}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="mt-1.5 text-destructive/70 hover:text-destructive shrink-0"
        onClick={onRemove}
        aria-label={t("removeSocialMedia")}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

// ─── AdditionalLocationCard ──────────────────────────────────────

interface AdditionalLocationCardProps {
  location: AdditionalLocation;
  t: (key: string, values?: Record<string, unknown>) => string;
  onUpdate: (patch: Partial<AdditionalLocation>) => void;
  onRemove: () => void;
}

function AdditionalLocationCard({
  location,
  t,
  onUpdate,
  onRemove,
}: AdditionalLocationCardProps) {
  return (
    <div className="rounded-lg border bg-background p-4 space-y-3 dark:border-muted-foreground/20">
      {/* Top row: name + delete */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("locationNamePlaceholder")}
          value={location.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 min-w-0 dark:border-muted-foreground/20 dark:bg-muted/30"
          aria-label={t("locationName")}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive/70 hover:text-destructive shrink-0"
          onClick={onRemove}
          aria-label={t("removeLocation")}
        >
          <Trash2 />
        </Button>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("locationAddress")}
        </Label>
        <Input
          placeholder={t("locationAddressPlaceholder")}
          value={location.address}
          onChange={(e) => onUpdate({ address: e.target.value })}
          className="dark:border-muted-foreground/20 dark:bg-muted/30"
        />
      </div>

      {/* Phone (optional) */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {t("locationPhone")}
        </Label>
        <Input
          type="tel"
          placeholder={t("phonePlaceholder")}
          value={location.phone ?? ""}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          className="dark:border-muted-foreground/20 dark:bg-muted/30"
        />
      </div>
    </div>
  );
}
