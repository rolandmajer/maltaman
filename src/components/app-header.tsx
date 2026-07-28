"use client";

import Link from "next/link";
import Image from "next/image";
import { Settings, LogOut, Home } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { Button } from "@/components/ui/button";

export function AppHeader({ userName, backHref }: { userName: string; backHref?: string }) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <Link href={backHref} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Späť na prehľad">
              <Home className="size-5" />
            </Link>
          ) : (
            <Link href="/" aria-label="MALTAMAN">
              <Image src="/logo.png" alt="MALTAMAN" width={110} height={15} className="h-4 w-auto" priority />
            </Link>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <SyncStatusBadge className="hidden sm:inline-flex" />
          <span className="hidden truncate text-sm text-slate-500 md:inline">{userName}</span>
          <Link href="/nastavenia">
            <Button variant="ghost" size="icon" aria-label="Nastavenia">
              <Settings className="size-5" />
            </Button>
          </Link>
          <form action={signOutAction}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Odhlásiť sa">
              <LogOut className="size-5" />
            </Button>
          </form>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-1.5 sm:hidden">
        <SyncStatusBadge />
      </div>
    </header>
  );
}
