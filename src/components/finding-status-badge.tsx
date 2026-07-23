import { CheckCircle2, AlertTriangle, ShieldAlert, MinusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FINDING_STATUS_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CONFIG = {
  OK: { variant: "ok" as const, icon: CheckCircle2, label: "OK – bez zistení" },
  V: { variant: "vada" as const, icon: AlertTriangle, label: "Vada, vyžaduje opravu" },
  R: { variant: "riziko" as const, icon: ShieldAlert, label: "Riziko, odborné posúdenie" },
  N: { variant: "neposudzovane" as const, icon: MinusCircle, label: "Neposudzované / neprístupné" },
};

export function FindingStatusBadge({ status, className }: { status: keyof typeof CONFIG; className?: string }) {
  const config = CONFIG[status] ?? CONFIG.N;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={cn("shrink-0", className)} title={config.label}>
      <Icon aria-hidden="true" className="size-3.5" />
      <span>{FINDING_STATUS_SHORT[status] ?? status}</span>
      <span className="sr-only">{config.label}</span>
    </Badge>
  );
}
