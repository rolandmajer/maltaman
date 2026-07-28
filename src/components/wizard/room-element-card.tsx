"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FolderInput, Wand2 } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ElementStatusToggle } from "@/components/wizard/status-toggle";
import { ElementAttributesForm } from "@/components/wizard/element-attributes-form";
import { ElementConditionEntry } from "@/components/wizard/element-condition-entry";
import { InlineTextAreaField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { RoomTargetPicker } from "@/components/wizard/room-target-picker";
import { Button } from "@/components/ui/button";
import { generateElementDescription, shouldAutoApplyDescription } from "@/lib/element-description";
import { ELEMENT_STATUS_LABELS, ELEMENT_NA_REASON_LABELS, ROOM_ELEMENT_ADDITIONAL_CONFIG } from "@/lib/constants";
import { cn, scrollCardIntoView } from "@/lib/utils";
import type { FullRoomElement } from "@/types/inspection";

export function RoomElementCard({
  element,
  roomId,
  inspectionId,
  rooms,
  onElementChange,
  onAttributeChange,
  onAddCondition,
  onConditionChange,
  onConditionDelete,
  onConditionDuplicate,
  onConditionReorder,
  onConditionCopyToRooms,
  onConditionCreateCostItem,
  onMeasurementAdd,
  onMeasurementChange,
  onMeasurementDelete,
  onPhotoAdded,
  onPhotoDeleted,
  onAddInstance,
  onCopyAssessmentToRooms,
  onApplyAttributesToRooms,
}: {
  element: FullRoomElement;
  roomId: string;
  inspectionId: string;
  rooms: { id: string; name: string }[];
  onElementChange: (patch: Partial<FullRoomElement>) => void;
  onAttributeChange: (attributeKey: string, value: string) => void;
  onAddCondition: () => void;
  onConditionChange: (conditionId: string, patch: Partial<FullRoomElement["conditions"][number]>) => void;
  onConditionDelete: (conditionId: string) => void;
  onConditionDuplicate: (conditionId: string) => void;
  onConditionReorder: (orderedIds: string[]) => void;
  onConditionCopyToRooms: (conditionId: string, targetRoomIds: string[]) => void;
  onConditionCreateCostItem: (conditionId: string) => void;
  onMeasurementAdd: (conditionId: string) => void;
  onMeasurementChange: (conditionId: string, measurementId: string, patch: { label?: string; value?: number; unit?: string }) => void;
  onMeasurementDelete: (conditionId: string, measurementId: string) => void;
  onPhotoAdded: (conditionId: string, photo: FullRoomElement["conditions"][number]["photos"][number]) => void;
  onPhotoDeleted: (conditionId: string, photoId: string) => void;
  onAddInstance?: () => void;
  onCopyAssessmentToRooms: (targetRoomIds: string[]) => void;
  onApplyAttributesToRooms: (targetRoomIds: string[]) => void;
}) {
  const needsDetail = element.status === "V" || element.status === "R";
  const [open, setOpen] = useState(needsDetail);
  const [dismissedAutoText, setDismissedAutoText] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const conditions = element.conditions.slice().sort((a, b) => a.order - b.order);

  /** Collapse from the bottom of a long card without leaving the technician stranded below it. */
  function collapse() {
    setOpen(false);
    scrollCardIntoView(cardRef.current);
  }
  const config = ROOM_ELEMENT_ADDITIONAL_CONFIG[element.elementKey];

  const nextAuto = useMemo(
    () => generateElementDescription(element.elementKey, element.attributes, element.conditions),
    [element.elementKey, element.attributes, element.conditions]
  );

  useEffect(() => {
    // Regenerating the description is a real external-system side effect (an optimistic local
    // update plus a network PATCH via applyAndSave), so — unlike purely local derived-state sync
    // — it belongs in an effect, not adjusted during render. The value-equality guard means this
    // only ever fires once per actual content change, however often the effect re-runs.
    if (shouldAutoApplyDescription(element.descriptionIsManual) && nextAuto !== element.description) {
      onElementChange({ description: nextAuto });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextAuto, element.descriptionIsManual, element.description]);

  const autoAvailable =
    element.descriptionIsManual && nextAuto !== element.description && nextAuto !== "" && dismissedAutoText !== nextAuto;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = conditions.findIndex((c) => c.id === active.id);
    const newIndex = conditions.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onConditionReorder(arrayMove(conditions, oldIndex, newIndex).map((c) => c.id));
  }

  return (
    <div ref={cardRef} className="rounded-lg border border-slate-200">
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-slate-800"
          aria-expanded={open}
        >
          <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          <span className="min-w-0">
            <span className="block truncate">{element.label}</span>
            {(element.status !== "OK" || conditions.length > 0) && (
              <span className="block text-xs text-slate-500">
                {ELEMENT_STATUS_LABELS[element.status]?.split(" – ")[0]}
                {conditions.length > 0 ? ` – ${conditions.length} zistenia` : ""}
              </span>
            )}
          </span>
        </button>
        <Button variant="outline" size="sm" onClick={() => onElementChange({ status: "OK" })} title="OK, bez viditeľného poškodenia">
          OK ✓
        </Button>
        <Button variant="outline" size="sm" onClick={() => onElementChange({ status: "N", naReason: "NEPRISTUPNE" })} title="N — neprístupné">
          N — neprístupné
        </Button>
        <ElementStatusToggle
          ariaLabel={`Hodnotenie — ${element.label}`}
          value={element.status}
          onChange={(status) =>
            onElementChange({
              status,
              naReason: status === "N" ? (element.naReason ?? "NEPRISTUPNE") : null,
            })
          }
        />
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-slate-100 p-3">
          {element.status === "N" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NativeSelectField
                label="Dôvod"
                value={element.naReason ?? "NEPRISTUPNE"}
                onChange={(v) => onElementChange({ naReason: v as FullRoomElement["naReason"] })}
              >
                {Object.entries(ELEMENT_NA_REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </NativeSelectField>
              {element.naReason === "INY_DOVOD" && (
                <InlineTextAreaField label="Doplniť dôvod" value={element.naReasonNote} onCommit={(v) => onElementChange({ naReasonNote: v })} />
              )}
            </div>
          )}

          {element.status !== "NEVZTAHUJE_SA" && (
            <>
              <ElementAttributesForm elementKey={element.elementKey} attributes={element.attributes} onAttributeChange={onAttributeChange} />

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      element.descriptionIsManual ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {element.descriptionIsManual ? "Upravené technikom" : "Automaticky generovaný text"}
                  </span>
                </div>
                <InlineTextAreaField
                  label="Popis"
                  value={element.description}
                  onCommit={(v) => onElementChange({ description: v, descriptionIsManual: true })}
                />
                {autoAvailable && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                    <Wand2 className="size-3.5 shrink-0" />
                    <span className="flex-1">Popis bol upravený ručne. Nová automatická verzia je k dispozícii.</span>
                    <button type="button" className="font-medium underline" onClick={() => setDismissedAutoText(nextAuto)}>
                      Ponechať môj text
                    </button>
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => onElementChange({ description: nextAuto, descriptionIsManual: false })}
                    >
                      Nahradiť automatickým textom
                    </button>
                  </div>
                )}
              </div>

              {needsDetail && conditions.length === 0 && (
                <p className="text-xs font-medium text-amber-700">Zadajte aspoň jeden stav alebo zistenie.</p>
              )}

              <div className="flex flex-col gap-2">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={conditions.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {conditions.map((condition, index) => (
                      <ElementConditionEntry
                        key={condition.id}
                        condition={condition}
                        index={index}
                        elementKey={element.elementKey}
                        elementLabel={element.label}
                        attributes={element.attributes}
                        inspectionId={inspectionId}
                        roomId={roomId}
                        rooms={rooms}
                        onChange={(patch) => onConditionChange(condition.id, patch)}
                        onDuplicate={() => onConditionDuplicate(condition.id)}
                        onDelete={() => onConditionDelete(condition.id)}
                        onCopyToRooms={(targetRoomIds) => onConditionCopyToRooms(condition.id, targetRoomIds)}
                        onCreateCostItem={() => onConditionCreateCostItem(condition.id)}
                        onMeasurementAdd={() => onMeasurementAdd(condition.id)}
                        onMeasurementChange={(measurementId, patch) => onMeasurementChange(condition.id, measurementId, patch)}
                        onMeasurementDelete={(measurementId) => onMeasurementDelete(condition.id, measurementId)}
                        onPhotoAdded={(photo) => onPhotoAdded(condition.id, photo)}
                        onPhotoDeleted={(photoId) => onPhotoDeleted(condition.id, photoId)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <Button variant="outline" size="sm" className="self-start" onClick={onAddCondition}>
                  + Pridať stav alebo zistenie
                </Button>
              </div>

              {config?.allowMultiple && onAddInstance && (
                <Button variant="ghost" size="sm" className="self-start text-slate-500" onClick={onAddInstance}>
                  + Pridať ďalší prvok „{element.label.replace(/\s\d+$/, "")}“
                </Button>
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                <RoomTargetPicker
                  rooms={rooms}
                  excludeRoomId={roomId}
                  onConfirm={onCopyAssessmentToRooms}
                  trigger={
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                      <FolderInput className="size-3.5" /> Kopírovať posúdenie do miestnosti
                    </Button>
                  }
                />
                <RoomTargetPicker
                  rooms={rooms}
                  excludeRoomId={roomId}
                  onConfirm={onApplyAttributesToRooms}
                  trigger={
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                      <Wand2 className="size-3.5" /> Použiť rovnaký materiál v ďalších miestnostiach
                    </Button>
                  }
                />
              </div>
            </>
          )}

          <Button variant="outline" size="sm" onClick={collapse} className="w-full">
            <ChevronUp className="size-4" /> Zavrieť „{element.label}“
          </Button>
        </div>
      )}
    </div>
  );
}
