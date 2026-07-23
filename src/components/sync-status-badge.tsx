"use client";

import { CloudCheck, CloudOff, RefreshCw, UploadCloud } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cn } from "@/lib/utils";

export function SyncStatusBadge({ className }: { className?: string }) {
  const { state, pendingCount, trySync } = useOnlineStatus();

  const config = {
    "online-synced": { icon: CloudCheck, label: "Synchronizované", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    "online-syncing": { icon: RefreshCw, label: "Synchronizuje sa…", tone: "text-brand-700 bg-brand-50 border-brand-200" },
    "offline-pending": {
      icon: UploadCloud,
      label: `Uložené v zariadení (${pendingCount})`,
      tone: "text-amber-700 bg-amber-50 border-amber-200",
    },
    offline: { icon: CloudOff, label: "Bez pripojenia — uložené v zariadení", tone: "text-slate-700 bg-slate-100 border-slate-200" },
  }[state];

  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => void trySync()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.tone,
        className
      )}
      title="Kliknutím skúsiť synchronizovať"
    >
      <Icon aria-hidden="true" className={cn("size-3.5", state === "online-syncing" && "animate-spin")} />
      <span>{config.label}</span>
    </button>
  );
}
