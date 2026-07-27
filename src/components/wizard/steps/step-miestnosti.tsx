"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete, NetworkUnavailableError } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { RoomCard } from "@/components/wizard/room-card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ROOM_TYPE_PRESETS } from "@/lib/constants";
import type { FullRoom, FullRoomElement } from "@/types/inspection";

type FullElementCondition = FullRoomElement["conditions"][number];
type FullConditionPhoto = FullElementCondition["photos"][number];

export function StepMiestnosti() {
  const { inspection, applyAndSave, create, refetch } = useInspectionContext();
  const [addOpen, setAddOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const rooms = inspection.rooms.slice().sort((a, b) => a.order - b.order);
  const roomTargets = rooms.map((r) => ({ id: r.id, name: r.name }));

  function nextNameForType(type: string) {
    const existing = rooms.filter((r) => r.type === type).length;
    return existing > 0 ? `${type} ${existing + 1}` : type;
  }

  async function addRoom(type: string) {
    setAddOpen(false);
    const name = nextNameForType(type);
    const created = await create(
      () => apiPost<FullRoom>(`/api/inspections/${inspection.id}/rooms`, { name, type, order: rooms.length }, "Nová miestnosť"),
      (prev, created) => ({ ...prev, rooms: [...prev.rooms, created] })
    );
    if (created) setLastAddedId(created.id);
  }

  function updateRoom(roomId: string, patch: Partial<FullRoom>) {
    void applyAndSave(
      (prev) => ({ ...prev, rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/rooms/${roomId}`, patch, "Miestnosť")
    );
  }

  function deleteRoom(roomId: string) {
    void applyAndSave(
      (prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== roomId) }),
      () => apiDelete(`/api/inspections/${inspection.id}/rooms/${roomId}`, "Odstránenie miestnosti")
    );
  }

  async function duplicateRoom(roomId: string) {
    const created = await create(
      () => apiPost<FullRoom>(`/api/inspections/${inspection.id}/rooms/${roomId}/duplicate`, {}, "Kópia miestnosti"),
      (prev, created) => ({ ...prev, rooms: [...prev.rooms, created] })
    );
    if (created) setLastAddedId(created.id);
  }

  function moveRoom(roomId: string, direction: "up" | "down") {
    const index = rooms.findIndex((r) => r.id === roomId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rooms.length) return;
    const a = rooms[index];
    const b = rooms[swapWith];
    void applyAndSave(
      (prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) => {
          if (r.id === a.id) return { ...r, order: b.order };
          if (r.id === b.id) return { ...r, order: a.order };
          return r;
        }),
      }),
      () =>
        Promise.all([
          apiPatch(`/api/inspections/${inspection.id}/rooms/${a.id}`, { order: b.order }),
          apiPatch(`/api/inspections/${inspection.id}/rooms/${b.id}`, { order: a.order }),
        ])
    );
  }

  // --- element-level helpers ---------------------------------------------------------------

  function mapElement(roomId: string, elementId: string, fn: (el: FullRoomElement) => FullRoomElement) {
    return (prev: typeof inspection) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id !== roomId ? r : { ...r, elements: r.elements.map((e) => (e.id === elementId ? fn(e) : e)) }
      ),
    });
  }

  function updateElement(roomId: string, elementId: string, patch: Partial<FullRoomElement>) {
    void applyAndSave(
      mapElement(roomId, elementId, (e) => ({ ...e, ...patch })),
      () => apiPatch(`/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}`, patch, "Prvok")
    );
  }

  function updateAttribute(roomId: string, elementId: string, attributeKey: string, value: string) {
    void applyAndSave(
      mapElement(roomId, elementId, (e) => {
        const existing = e.attributes.find((a) => a.attributeKey === attributeKey);
        const attributes = existing
          ? e.attributes.map((a) => (a.attributeKey === attributeKey ? { ...a, value } : a))
          : [...e.attributes, { id: `temp-${attributeKey}`, roomElementId: elementId, attributeKey, value }];
        return { ...e, attributes };
      }),
      () =>
        apiPatch(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/attributes`,
          { attributeKey, value },
          "Vlastnosť prvku"
        )
    );
  }

  async function addInstance(roomId: string, elementKey: string, baseLabel: string) {
    const room = rooms.find((r) => r.id === roomId);
    const count = room?.elements.filter((e) => e.elementKey === elementKey).length ?? 0;
    const label = `${baseLabel} ${count + 1}`;
    await create(
      () => apiPost<FullRoomElement>(`/api/inspections/${inspection.id}/rooms/${roomId}/elements`, { elementKey, label }, "Nový prvok"),
      (prev, created) => ({
        ...prev,
        rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, elements: [...r.elements, created] } : r)),
      })
    );
  }

  async function copyAssessmentToRooms(roomId: string, elementId: string, targetRoomIds: string[]) {
    try {
      for (const targetRoomId of targetRoomIds) {
        await apiPost(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/copy-to-room`,
          { targetRoomId },
          "Kopírovanie posúdenia"
        );
      }
      toast.success("Posúdenie skopírované.");
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof NetworkUnavailableError
          ? "Kopírovanie vyžaduje pripojenie na internet."
          : error instanceof Error
            ? error.message
            : "Kopírovanie zlyhalo"
      );
    }
  }

  async function applyAttributesToRooms(roomId: string, elementId: string, targetRoomIds: string[]) {
    try {
      await apiPost(
        `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/apply-to-rooms`,
        { targetRoomIds },
        "Použitie materiálu"
      );
      toast.success("Materiál použitý vo vybraných miestnostiach.");
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof NetworkUnavailableError
          ? "Táto akcia vyžaduje pripojenie na internet."
          : error instanceof Error
            ? error.message
            : "Akcia zlyhala"
      );
    }
  }

  // --- condition-level helpers --------------------------------------------------------------

  function mapConditions(
    roomId: string,
    elementId: string,
    fn: (conditions: FullElementCondition[]) => FullElementCondition[]
  ) {
    return mapElement(roomId, elementId, (e) => ({ ...e, conditions: fn(e.conditions) }));
  }

  async function addCondition(roomId: string, elementId: string) {
    await create(
      () =>
        apiPost<FullElementCondition>(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/conditions`,
          {},
          "Nové zistenie"
        ),
      (prev, created) => mapConditions(roomId, elementId, (c) => [...c, created])(prev)
    );
  }

  function updateCondition(roomId: string, elementId: string, conditionId: string, patch: Partial<FullElementCondition>) {
    void applyAndSave(
      mapConditions(roomId, elementId, (list) => list.map((c) => (c.id === conditionId ? { ...c, ...patch } : c))),
      () =>
        apiPatch(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/conditions/${conditionId}`,
          patch,
          "Zistenie"
        )
    );
  }

  function deleteCondition(roomId: string, elementId: string, conditionId: string) {
    void applyAndSave(
      mapConditions(roomId, elementId, (list) => list.filter((c) => c.id !== conditionId)),
      () =>
        apiDelete(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/conditions/${conditionId}`,
          "Odstránenie zistenia"
        )
    );
  }

  async function duplicateCondition(roomId: string, elementId: string, conditionId: string) {
    await create(
      () =>
        apiPost<FullElementCondition>(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/conditions/${conditionId}/duplicate`,
          {},
          "Kópia zistenia"
        ),
      (prev, created) => mapConditions(roomId, elementId, (c) => [...c, created])(prev)
    );
  }

  function reorderConditions(roomId: string, elementId: string, orderedIds: string[]) {
    void applyAndSave(
      mapConditions(roomId, elementId, (list) =>
        orderedIds.map((id, index) => {
          const found = list.find((c) => c.id === id)!;
          return { ...found, order: index };
        })
      ),
      () =>
        apiPatch(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/conditions/reorder`,
          { orderedIds },
          "Poradie zistení"
        )
    );
  }

  async function copyConditionToRooms(roomId: string, elementId: string, conditionId: string, targetRoomIds: string[]) {
    try {
      await apiPost(
        `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/conditions/${conditionId}/copy-to-rooms`,
        { targetRoomIds },
        "Kopírovanie zistenia"
      );
      toast.success("Zistenie skopírované.");
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof NetworkUnavailableError
          ? "Kopírovanie vyžaduje pripojenie na internet."
          : error instanceof Error
            ? error.message
            : "Kopírovanie zlyhalo"
      );
    }
  }

  async function createCostItemFromCondition(roomId: string, elementId: string, conditionId: string) {
    const room = rooms.find((r) => r.id === roomId);
    const element = room?.elements.find((e) => e.id === elementId);
    const condition = element?.conditions.find((c) => c.id === conditionId);
    const category = inspection.costCategories[0];
    if (!element || !condition || !category) return;
    let defectSummary = "";
    try {
      defectSummary = (JSON.parse(condition.defectTypes) as string[]).join(", ");
    } catch {
      defectSummary = "";
    }
    await create(
      () =>
        apiPost(
          `/api/inspections/${inspection.id}/cost-items`,
          {
            categoryId: category.id,
            roomId,
            roomElementId: elementId,
            elementConditionId: conditionId,
            name: element.label,
            description: condition.note || defectSummary,
            quantity: 1,
            unit: "KS",
          },
          "Položka zo stavu prvku"
        ),
      (prev, created) => ({ ...prev, costItems: [...prev.costItems, created as FullRoom["costItems"][number]] })
    );
  }

  // --- measurement helpers -------------------------------------------------------------------

  async function addMeasurement(roomId: string, elementId: string, conditionId: string) {
    await create(
      () =>
        apiPost<FullElementCondition["measurements"][number]>(
          `/api/inspections/${inspection.id}/rooms/${roomId}/elements/${elementId}/conditions/${conditionId}/measurements`,
          { label: "", value: 0, unit: "" },
          "Nové meranie"
        ),
      (prev, created) =>
        mapConditions(roomId, elementId, (list) =>
          list.map((c) => (c.id === conditionId ? { ...c, measurements: [...c.measurements, created] } : c))
        )(prev)
    );
  }

  function updateMeasurement(
    roomId: string,
    elementId: string,
    conditionId: string,
    measurementId: string,
    patch: { label?: string; value?: number; unit?: string }
  ) {
    void applyAndSave(
      mapConditions(roomId, elementId, (list) =>
        list.map((c) =>
          c.id !== conditionId
            ? c
            : { ...c, measurements: c.measurements.map((m) => (m.id === measurementId ? { ...m, ...patch } : m)) }
        )
      ),
      () => apiPatch(`/api/inspections/${inspection.id}/measurements/${measurementId}`, patch, "Meranie")
    );
  }

  function deleteMeasurement(roomId: string, elementId: string, conditionId: string, measurementId: string) {
    void applyAndSave(
      mapConditions(roomId, elementId, (list) =>
        list.map((c) => (c.id !== conditionId ? c : { ...c, measurements: c.measurements.filter((m) => m.id !== measurementId) }))
      ),
      () => apiDelete(`/api/inspections/${inspection.id}/measurements/${measurementId}`, "Odstránenie merania")
    );
  }

  // --- photo helpers (upload/delete itself happens in ElementConditionEntry; this just merges
  // the already-completed result into local state) -------------------------------------------

  function onPhotoAdded(roomId: string, elementId: string, conditionId: string, photo: FullConditionPhoto) {
    void applyAndSave(
      mapConditions(roomId, elementId, (list) =>
        list.map((c) => (c.id === conditionId ? { ...c, photos: [...c.photos, photo] } : c))
      ),
      () => Promise.resolve()
    );
  }

  function onPhotoDeleted(roomId: string, elementId: string, conditionId: string, photoId: string) {
    void applyAndSave(
      mapConditions(roomId, elementId, (list) =>
        list.map((c) => (c.id !== conditionId ? c : { ...c, photos: c.photos.filter((p) => p.id !== photoId) }))
      ),
      () => Promise.resolve()
    );
  }

  return (
    <div>
      <StepPageHeader
        title="Miestnosti"
        description="Pridajte ľubovoľný počet miestností. Každá má vlastný kontrolný zoznam prvkov."
      />

      <StepSection
        title={`Miestnosti (${rooms.length})`}
        actions={
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus /> Pridať miestnosť
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <p className="mb-2 text-sm font-medium text-slate-700">Vyberte typ miestnosti</p>
              <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto">
                {ROOM_TYPE_PRESETS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => void addRoom(type)}
                    className="rounded-md border border-slate-200 px-2 py-2 text-left text-sm text-slate-700 hover:border-brand-400 hover:bg-brand-50"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        }
      >
        {rooms.length === 0 && (
          <p className="text-sm text-slate-400">Zatiaľ žiadne miestnosti. Začnite pridaním prvej miestnosti vyššie.</p>
        )}
        <div className="flex flex-col gap-3">
          {rooms.map((room, index) => (
            <RoomCard
              key={room.id}
              room={room}
              roomTargets={roomTargets}
              inspectionId={inspection.id}
              defaultOpen={room.id === lastAddedId}
              canMoveUp={index > 0}
              canMoveDown={index < rooms.length - 1}
              onUpdate={(patch) => updateRoom(room.id, patch)}
              onDuplicate={() => void duplicateRoom(room.id)}
              onDelete={() => deleteRoom(room.id)}
              onMove={(dir) => moveRoom(room.id, dir)}
              onElementChange={(elementId, patch) => updateElement(room.id, elementId, patch)}
              onAttributeChange={(elementId, key, value) => updateAttribute(room.id, elementId, key, value)}
              onAddCondition={(elementId) => void addCondition(room.id, elementId)}
              onConditionChange={(elementId, conditionId, patch) => updateCondition(room.id, elementId, conditionId, patch)}
              onConditionDelete={(elementId, conditionId) => deleteCondition(room.id, elementId, conditionId)}
              onConditionDuplicate={(elementId, conditionId) => void duplicateCondition(room.id, elementId, conditionId)}
              onConditionReorder={(elementId, orderedIds) => reorderConditions(room.id, elementId, orderedIds)}
              onConditionCopyToRooms={(elementId, conditionId, targetRoomIds) =>
                void copyConditionToRooms(room.id, elementId, conditionId, targetRoomIds)
              }
              onConditionCreateCostItem={(elementId, conditionId) => void createCostItemFromCondition(room.id, elementId, conditionId)}
              onMeasurementAdd={(elementId, conditionId) => void addMeasurement(room.id, elementId, conditionId)}
              onMeasurementChange={(elementId, conditionId, measurementId, patch) =>
                updateMeasurement(room.id, elementId, conditionId, measurementId, patch)
              }
              onMeasurementDelete={(elementId, conditionId, measurementId) =>
                deleteMeasurement(room.id, elementId, conditionId, measurementId)
              }
              onPhotoAdded={(elementId, conditionId, photo) => onPhotoAdded(room.id, elementId, conditionId, photo)}
              onPhotoDeleted={(elementId, conditionId, photoId) => onPhotoDeleted(room.id, elementId, conditionId, photoId)}
              onAddInstance={(elementKey, baseLabel) => void addInstance(room.id, elementKey, baseLabel)}
              onCopyAssessmentToRooms={(elementId, targetRoomIds) => void copyAssessmentToRooms(room.id, elementId, targetRoomIds)}
              onApplyAttributesToRooms={(elementId, targetRoomIds) => void applyAttributesToRooms(room.id, elementId, targetRoomIds)}
            />
          ))}
        </div>
      </StepSection>
    </div>
  );
}
