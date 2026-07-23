"use client";

import { useState } from "react";
import { ChevronDown, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { InlineTextField, InlineTextAreaField } from "@/components/wizard/inline-field";
import { NativeSelectField } from "@/components/wizard/native-select-field";
import { RoomChecklistRow } from "@/components/wizard/room-checklist-row";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { computeRoomArea } from "@/lib/calculations";
import { formatArea } from "@/lib/format";
import { ROOM_TYPE_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FullRoom, FullFinding } from "@/types/inspection";

export function RoomCard({
  room,
  defaultOpen,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onFindingUpdate,
  onDuplicate,
  onDelete,
  onMove,
}: {
  room: FullRoom;
  defaultOpen?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdate: (patch: Partial<FullRoom>) => void;
  onFindingUpdate: (findingId: string, patch: Partial<FullFinding>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const area = computeRoomArea(room.lengthM, room.widthM, room.areaOverrideM2);
  const issueCount = room.findings.filter((f) => f.status === "V" || f.status === "R").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center">
          <Button variant="ghost" size="icon" onClick={() => onMove("up")} disabled={!canMoveUp} aria-label="Presunúť vyššie">
            <ArrowUp className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMove("down")} disabled={!canMoveDown} aria-label="Presunúť nižšie">
            <ArrowDown className="size-4" />
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <ChevronDown className={cn("size-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{room.name}</p>
            <p className="text-xs text-slate-500">
              {room.type}
              {area ? ` · ${formatArea(area)}` : ""}
              {issueCount > 0 ? ` · ${issueCount}× zistenie` : ""}
            </p>
          </div>
        </button>
        <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplikovať miestnosť" title="Duplikovať miestnosť">
          <Copy className="size-4" />
        </Button>
        <ConfirmDeleteButton
          onConfirm={onDelete}
          title="Odstrániť miestnosť?"
          description={`Naozaj chcete odstrániť „${room.name}“ vrátane všetkých zistení, fotografií a položiek nákladov?`}
        />
      </div>

      {open && (
        <div className="border-t border-slate-100 p-3">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InlineTextField label="Názov miestnosti" value={room.name} onCommit={(v) => onUpdate({ name: v })} />
            <RoomTypeSelect value={room.type} onChange={(v) => onUpdate({ type: v })} />
            <InlineTextField label="Podlažie" value={room.floorLevel} onCommit={(v) => onUpdate({ floorLevel: v })} />
            <div className="grid grid-cols-3 gap-2">
              <InlineTextField
                label="Dĺžka (m)"
                type="number"
                value={String(room.lengthM ?? "")}
                onCommit={(v) => onUpdate({ lengthM: v ? Number(v) : null })}
              />
              <InlineTextField
                label="Šírka (m)"
                type="number"
                value={String(room.widthM ?? "")}
                onCommit={(v) => onUpdate({ widthM: v ? Number(v) : null })}
              />
              <InlineTextField
                label="Výška (m)"
                type="number"
                value={String(room.heightM ?? "")}
                onCommit={(v) => onUpdate({ heightM: v ? Number(v) : null })}
              />
            </div>
            <InlineTextField
              label={`Plocha override (vypočítaná: ${area != null ? formatArea(area) : "—"})`}
              type="number"
              value={String(room.areaOverrideM2 ?? "")}
              onCommit={(v) => onUpdate({ areaOverrideM2: v ? Number(v) : null })}
            />
            <InlineTextField
              label="Celkový stav"
              value={room.generalCondition}
              onCommit={(v) => onUpdate({ generalCondition: v })}
            />
            <InlineTextField label="Prístupnosť" value={room.accessibility} onCommit={(v) => onUpdate({ accessibility: v })} />
            <InlineTextAreaField
              label="Poznámky"
              value={room.notes}
              className="sm:col-span-2"
              onCommit={(v) => onUpdate({ notes: v })}
            />
          </div>

          <h3 className="mb-2 text-sm font-semibold text-slate-700">Kontrolný zoznam</h3>
          <div className="flex flex-col gap-2">
            {room.findings
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((finding) => (
                <RoomChecklistRow
                  key={finding.id}
                  finding={finding}
                  onChange={(patch) => onFindingUpdate(finding.id, patch)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomTypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <NativeSelectField
      label="Typ miestnosti"
      value={ROOM_TYPE_PRESETS.includes(value as never) ? value : "Iná miestnosť"}
      onChange={onChange}
    >
      {ROOM_TYPE_PRESETS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </NativeSelectField>
  );
}
