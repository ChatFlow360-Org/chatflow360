"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// ─── Types ────────────────────────────────────────────────────────

interface LogoCropModalProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
}

// Output dimensions (2x for retina)
const OUTPUT_WIDTH = 400;
const OUTPUT_HEIGHT = 120;
const ASPECT = OUTPUT_WIDTH / OUTPUT_HEIGHT; // ~3.33

// ─── Helpers ──────────────────────────────────────────────────────

async function getCroppedBlob(
  imageSrc: string,
  crop: Area,
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
      "image/png",
      1,
    );
  });
}

// ─── Component ────────────────────────────────────────────────────

export function LogoCropModal({
  open,
  imageSrc,
  onClose,
  onCropped,
}: LogoCropModalProps) {
  const t = useTranslations("settings.postChat");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  async function handleAccept() {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onCropped(blob);
    } catch {
      // Fallback: shouldn't happen
    } finally {
      setProcessing(false);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && !processing) {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("cropTitle")}</DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative h-64 w-full overflow-hidden rounded-lg bg-black/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            style={{
              containerStyle: { borderRadius: "0.5rem" },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
          <Slider
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t("cropHint")}
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={processing}
          >
            {t("cropCancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={processing}
            className="bg-cta hover:bg-cta/90 text-white"
          >
            {processing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("cropAccept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
