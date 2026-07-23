"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { RoomCard } from "@/components/wizard/room-card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ROOM_TYPE_PRESETS } from "@/lib/constants";
import type { FullRoom, FullFinding } from "@/types/inspection";

export function StepMiestnosti() {
  const { inspection, applyAndSave, create } = useInspectionContext();
  const [addOpen, setAddOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const rooms = inspection.rooms.slice().sort((a, b) => a.order - b.order);

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

  function updateFinding(roomId: string, findingId: string, patch: Partial<FullFinding>) {
    void applyAndSave(
      (prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) =>
          r.id === roomId
            ? { ...r, findings: r.findings.map((f) => (f.id === findingId ? { ...f, ...patch } : f)) }
            : r
        ),
      }),
      () => apiPatch(`/api/inspections/${inspection.id}/findings/${findingId}`, patch, "Zistenie")
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
              defaultOpen={room.id === lastAddedId}
              canMoveUp={index > 0}
              canMoveDown={index < rooms.length - 1}
              onUpdate={(patch) => updateRoom(room.id, patch)}
              onFindingUpdate={(findingId, patch) => updateFinding(room.id, findingId, patch)}
              onDuplicate={() => void duplicateRoom(room.id)}
              onDelete={() => deleteRoom(room.id)}
              onMove={(dir) => moveRoom(room.id, dir)}
            />
          ))}
        </div>
      </StepSection>
    </div>
  );
}
