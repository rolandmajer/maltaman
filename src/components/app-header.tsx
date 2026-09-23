"use client";

import Link from "next/link";
import Image from "next/image";
import { Settings, LogOut, Home, Users, ContactRound, ClipboardCheck, Calculator } from "lucide-react";
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
          <nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Hlavná navigácia">
            <Link href="/">
              <Button variant="ghost" size="sm"><ClipboardCheck /> Obhliadky</Button>
            </Link>
            <Link href="/crm/leads">
              <Button variant="ghost" size="sm"><ContactRound /> Leady</Button>
            </Link>
            <Link href="/crm/customers">
              <Button variant="ghost" size="sm"><Users /> Klienti</Button>
            </Link>
            <Link href="/cenove-ponuky">
              <Button variant="ghost" size="sm"><Calculator /> Ponuky</Button>
            </Link>
          </nav>
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
      <nav className="grid grid-cols-4 border-t border-slate-100 sm:hidden" aria-label="Hlavná navigácia">
        <Link href="/" className="flex items-center justify-center gap-1.5 py-2 text-xs text-slate-600">
          <ClipboardCheck className="size-4" /> Obhliadky
        </Link>
        <Link href="/crm/leads" className="flex items-center justify-center gap-1.5 py-2 text-xs text-slate-600">
          <ContactRound className="size-4" /> Leady
        </Link>
        <Link href="/crm/customers" className="flex items-center justify-center gap-1.5 py-2 text-xs text-slate-600">
          <Users className="size-4" /> Klienti
        </Link>
        <Link href="/cenove-ponuky" className="flex items-center justify-center gap-1.5 py-2 text-xs text-slate-600">
          <Calculator className="size-4" /> Ponuky
        </Link>
      </nav>
      <div className="border-t border-slate-100 px-4 py-1.5 sm:hidden">
        <SyncStatusBadge />
      </div>
    </header>
  );
}
