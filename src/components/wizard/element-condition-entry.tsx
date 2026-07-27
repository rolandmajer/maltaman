"use client";

import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Copy, Trash2, Camera, Calculator, FolderInput, X } from "lucide-react";
import { toast } from "sonner";
import { SearchableMultiSelect, SearchableSelect } from "@/components/wizard/searchable-select";
import { InlineTextField, InlineTextAreaField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { RoomTargetPicker } from "@/components/wizard/room-target-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { apiUpload, apiDelete } from "@/lib/offline/api-client";
import { parseJsonStringArray, stringifyJsonArray } from "@/lib/element-description";
import {
  CONDITION_TYPE_PRESETS,
  GENERAL_DEFECT_PRESETS,
  CONDITION_LOCATION_PRESETS,
  CONDITION_EXTENT_PRESETS,
  CONDITION_RECOMMENDED_ACTION_PRESETS,
  CONDITION_DEADLINE_LABELS,
  FINDING_SEVERITY_LABELS,
  ROOM_ELEMENT_ADDITIONAL_CONFIG,
} from "@/lib/constants";
import type { FullElementCondition, FullElementAttribute } from "@/types/inspection";

function locationOptionsFor(elementKey: string): string[] {
  const extra = ROOM_ELEMENT_ADDITIONAL_CONFIG[elementKey]?.locationPresets ?? [];
  return [...CONDITION_LOCATION_PRESETS, ...extra];
}

function defectOptionsFor(elementKey: string, attributes: FullElementAttribute[]): string[] {
  const config = CONDITION_TYPE_PRESETS[elementKey];
  if (!config) return GENERAL_DEFECT_PRESETS;
  let options = [...config.base];
  if (config.conditionalOn) {
    const controllingValue = attributes.find((a) => a.attributeKey === config.conditionalOn!.attributeKey)?.value;
    if (controllingValue && config.conditionalOn.valueToOptions[controllingValue]) {
      options = [...options, ...config.conditionalOn.valueToOptions[controllingValue]];
    }
  }
  return options;
}

export function ElementConditionEntry({
  condition,
  index,
  elementKey,
  elementLabel,
  attributes,
  inspectionId,
  roomId,
  rooms,
  onChange,
  onDuplicate,
  onDelete,
  onCopyToRooms,
  onCreateCostItem,
  onMeasurementAdd,
  onMeasurementChange,
  onMeasurementDelete,
  onPhotoAdded,
  onPhotoDeleted,
}: {
  condition: FullElementCondition;
  index: number;
  elementKey: string;
  elementLabel: string;
  attributes: FullElementAttribute[];
  inspectionId: string;
  roomId: string;
  rooms: { id: string; name: string }[];
  onChange: (patch: Partial<FullElementCondition>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyToRooms: (targetRoomIds: string[]) => void;
  onCreateCostItem: () => void;
  onMeasurementAdd: () => void;
  onMeasurementChange: (measurementId: string, patch: { label?: string; value?: number; unit?: string }) => void;
  onMeasurementDelete: (measurementId: string) => void;
  onPhotoAdded: (photo: FullElementCondition["photos"][number]) => void;
  onPhotoDeleted: (photoId: string) => void;
}) {
  const { attributes: dndAttributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: condition.id,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defectTypes = parseJsonStringArray(condition.defectTypes);
  const defectOptions = defectOptionsFor(elementKey, attributes);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("elementConditionId", condition.id);
        formData.append("capturedAt", new Date().toISOString());
        const photo = await apiUpload<FullElementCondition["photos"][number]>(
          `/api/inspections/${inspectionId}/photos`,
          formData
        );
        onPhotoAdded(photo);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nahrávanie fotografie zlyhalo");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deletePhoto(photoId: string) {
    await apiDelete(`/api/inspections/${inspectionId}/photos/${photoId}`, "Odstránenie fotografie").catch(() => undefined);
    onPhotoDeleted(photoId);
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...dndAttributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
          aria-label="Presunúť zistenie"
        >
          <GripVertical className="size-5" />
        </button>
        <p className="mt-1 flex-1 text-sm font-semibold text-slate-700">
          {elementLabel} — stav {index + 1}
        </p>
        <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplikovať zistenie" title="Duplikovať">
          <Copy className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Odstrániť zistenie" title="Odstrániť">
          <Trash2 className="size-4 text-red-600" />
        </Button>
      </div>

      <SearchableMultiSelect
        label="Typ stavu alebo poškodenia"
        values={defectTypes}
        onChange={(values) => onChange({ defectTypes: stringifyJsonArray(values) })}
        options={defectOptions}
        category={`defect-type:${elementKey}`}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SearchableSelect
          label="Presné umiestnenie"
          value={condition.location}
          onChange={(v) => onChange({ location: v })}
          options={locationOptionsFor(elementKey)}
          category="location"
        />
        <SearchableSelect
          label="Rozsah"
          value={condition.extent}
          onChange={(v) => onChange({ extent: v })}
          options={CONDITION_EXTENT_PRESETS}
          category="extent"
        />
        <NativeSelectField label="Závažnosť" value={condition.severity ?? ""} onChange={(v) => onChange({ severity: (v || null) as FullElementCondition["severity"] })}>
          <option value="">—</option>
          {Object.entries(FINDING_SEVERITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </NativeSelectField>
        <NativeSelectField label="Termín zásahu" value={condition.deadline ?? ""} onChange={(v) => onChange({ deadline: (v || null) as FullElementCondition["deadline"] })}>
          <option value="">—</option>
          {Object.entries(CONDITION_DEADLINE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </NativeSelectField>
        <InlineTextField label="Predpokladaná príčina" value={condition.cause} onCommit={(v) => onChange({ cause: v })} />
        <SearchableSelect
          label="Odporúčané opatrenie"
          value={condition.recommendedAction}
          onChange={(v) => onChange({ recommendedAction: v })}
          options={CONDITION_RECOMMENDED_ACTION_PRESETS}
          category="recommended-action"
        />
      </div>

      <InlineTextAreaField label="Poznámka" value={condition.note} onCommit={(v) => onChange({ note: v })} />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-slate-500">Merania</p>
        {condition.measurements.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <InlineTextField value={m.label} placeholder="Názov" onCommit={(v) => onMeasurementChange(m.id, { label: v })} className="flex-1" />
            <InlineTextField
              type="number"
              value={String(m.value)}
              placeholder="Hodnota"
              onCommit={(v) => onMeasurementChange(m.id, { value: Number(v) || 0 })}
              className="w-24"
            />
            <InlineTextField value={m.unit} placeholder="Jednotka" onCommit={(v) => onMeasurementChange(m.id, { unit: v })} className="w-20" />
            <Button variant="ghost" size="icon" onClick={() => onMeasurementDelete(m.id)} aria-label="Odstrániť meranie">
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="self-start" onClick={onMeasurementAdd}>
          + Pridať meranie
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-slate-500">Fotografie</p>
        <div className="flex flex-wrap gap-2">
          {condition.photos.map((photo, i) => (
            <div key={photo.id} className="group relative size-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${photo.id}/file?thumb=1`} alt={`Fotografia ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => void deletePhoto(photo.id)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                aria-label="Odstrániť fotografiu"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex size-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600"
            aria-label="Pridať fotografiu"
          >
            <Camera className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <Checkbox checked={condition.includeInSummary} onCheckedChange={(v) => onChange({ includeInSummary: Boolean(v) })} />
          Zahrnúť do zhrnutia
        </label>
        <Button variant="outline" size="sm" onClick={onCreateCostItem}>
          <Calculator className="size-3.5" /> Položka nákladov
        </Button>
        <RoomTargetPicker
          rooms={rooms}
          excludeRoomId={roomId}
          onConfirm={onCopyToRooms}
          trigger={
            <Button variant="outline" size="sm">
              <FolderInput className="size-3.5" /> Kopírovať do miestností
            </Button>
          }
        />
      </div>
    </div>
  );
}
