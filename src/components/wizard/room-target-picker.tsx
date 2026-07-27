"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

/** Multi-select room picker used for "copy to room(s)" / "apply to selected rooms" actions. */
export function RoomTargetPicker({
  rooms,
  excludeRoomId,
  onConfirm,
  trigger,
}: {
  rooms: { id: string; name: string }[];
  excludeRoomId: string;
  onConfirm: (targetRoomIds: string[]) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const candidates = rooms.filter((r) => r.id !== excludeRoomId);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function confirm() {
    if (selected.length === 0) return;
    onConfirm(selected);
    setSelected([]);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="mb-2 text-sm font-medium text-slate-700">Vyberte miestnosti</p>
        {candidates.length === 0 ? (
          <p className="text-sm text-slate-400">Žiadne ďalšie miestnosti.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto">
            {candidates.map((room) => (
              <label key={room.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-slate-700 hover:bg-brand-50">
                <Checkbox checked={selected.includes(room.id)} onCheckedChange={() => toggle(room.id)} />
                {room.name}
              </label>
            ))}
          </div>
        )}
        <Button size="sm" className="mt-2 w-full" disabled={selected.length === 0} onClick={confirm}>
          Potvrdiť
        </Button>
      </PopoverContent>
    </Popover>
  );
}
