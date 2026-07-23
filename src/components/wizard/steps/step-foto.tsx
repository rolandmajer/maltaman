"use client";

import { useRef, useState } from "react";
import { Camera, Star, EyeOff, RotateCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiUpload, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { PhotoAnnotator, type Annotation } from "@/components/wizard/photo-annotator";
import { InlineTextField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { FullPhoto } from "@/types/inspection";

export function StepFoto() {
  const { inspection, applyAndSave, refetch } = useInspectionContext();
  const [uploading, setUploading] = useState(false);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = inspection.photos.slice().sort((a, b) => a.order - b.order);
  const activePhoto = photos.find((p) => p.id === activePhotoId) ?? null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("capturedAt", new Date().toISOString());
        const created = await apiUpload<FullPhoto>(`/api/inspections/${inspection.id}/photos`, formData);
        await applyAndSave(
          (prev) => ({ ...prev, photos: [...prev.photos, created] }),
          () => Promise.resolve()
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nahrávanie fotografie zlyhalo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updatePhoto(id: string, patch: Partial<FullPhoto>) {
    void applyAndSave(
      (prev) => ({ ...prev, photos: prev.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/photos/${id}`, patch, "Fotografia")
    );
  }

  function deletePhoto(id: string) {
    void applyAndSave(
      (prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }),
      () => apiDelete(`/api/inspections/${inspection.id}/photos/${id}`, "Odstránenie fotografie")
    );
    if (activePhotoId === id) setActivePhotoId(null);
  }

  return (
    <div>
      <StepPageHeader title="Fotodokumentácia" description="Fotografie priraďte k miestnostiam alebo zisteniam a označte titulnú fotografiu." />

      <StepSection
        title={`Fotografie (${photos.length})`}
        actions={
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Camera /> {uploading ? "Nahrávam…" : "Fotiť / nahrať"}
            </Button>
          </div>
        }
      >
        {photos.length === 0 ? (
          <p className="text-sm text-slate-400">Zatiaľ žiadne fotografie.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActivePhotoId(photo.id)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${photo.id}/file?thumb=1`}
                  alt={photo.caption || `Fotografia ${index + 1}`}
                  style={{ transform: `rotate(${photo.rotationDegrees}deg)` }}
                  className={cn("h-full w-full object-cover transition-transform", photo.excludeFromReport && "opacity-40")}
                />
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {index + 1}
                </span>
                {photo.isCover && (
                  <span className="absolute right-1 top-1 rounded-full bg-amber-500 p-1 text-white">
                    <Star className="size-3" fill="currentColor" />
                  </span>
                )}
                {photo.excludeFromReport && (
                  <span className="absolute bottom-1 right-1 rounded-full bg-slate-700 p-1 text-white">
                    <EyeOff className="size-3" />
                  </span>
                )}
                {photo.caption && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {photo.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </StepSection>

      <Dialog open={!!activePhoto} onOpenChange={(open) => !open && setActivePhotoId(null)}>
        <DialogContent className="max-w-2xl">
          {activePhoto && (
            <PhotoDetail
              photo={activePhoto}
              rooms={inspection.rooms}
              findings={inspection.findings}
              onUpdate={(patch) => updatePhoto(activePhoto.id, patch)}
              onDelete={() => deletePhoto(activePhoto.id)}
              onRefetch={refetch}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotoDetail({
  photo,
  rooms,
  findings,
  onUpdate,
  onDelete,
  onRefetch,
}: {
  photo: FullPhoto;
  rooms: { id: string; name: string }[];
  findings: { id: string; label: string }[];
  onUpdate: (patch: Partial<FullPhoto>) => void;
  onDelete: () => void;
  onRefetch: () => Promise<void>;
}) {
  const annotations: Annotation[] = (() => {
    try {
      return JSON.parse(photo.annotationsJson) as Annotation[];
    } catch {
      return [];
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Fotografia</DialogTitle>
      </DialogHeader>

      <PhotoAnnotator
        imageUrl={`/api/photos/${photo.id}/file`}
        annotations={annotations}
        onChange={(next) => onUpdate({ annotationsJson: JSON.stringify(next) })}
      />

      <InlineTextField label="Popis" value={photo.caption} onCommit={(v) => onUpdate({ caption: v })} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NativeSelectField label="Miestnosť" value={photo.roomId ?? ""} onChange={(v) => onUpdate({ roomId: v || null })}>
          <option value="">—</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </NativeSelectField>
        <NativeSelectField label="Zistenie" value={photo.findingId ?? ""} onChange={(v) => onUpdate({ findingId: v || null })}>
          <option value="">—</option>
          {findings.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </NativeSelectField>
      </div>

      {photo.capturedAt && <p className="text-xs text-slate-400">Zachytené: {formatDateTime(photo.capturedAt)}</p>}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onUpdate({ rotationDegrees: (photo.rotationDegrees + 90) % 360 })}>
          <RotateCw /> Otočiť
        </Button>
        <Button size="sm" variant={photo.isCover ? "default" : "outline"} onClick={() => onUpdate({ isCover: true })}>
          <Star /> Titulná fotografia
        </Button>
        <Button
          size="sm"
          variant={photo.excludeFromReport ? "default" : "outline"}
          onClick={() => onUpdate({ excludeFromReport: !photo.excludeFromReport })}
        >
          <EyeOff /> {photo.excludeFromReport ? "Vylúčená z reportu" : "Vylúčiť z reportu"}
        </Button>
        <ConfirmDeleteButton onConfirm={onDelete} label="Odstrániť fotografiu" title="Odstrániť fotografiu?" />
      </div>
      <Button size="sm" variant="ghost" onClick={() => void onRefetch()} className="self-start text-xs text-slate-400">
        <Upload className="size-3" /> Obnoviť
      </Button>
    </div>
  );
}
