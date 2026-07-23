"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { apiGet, cacheInspection, getCachedInspection, NetworkUnavailableError } from "@/lib/offline/api-client";
import type { FullInspection } from "@/types/inspection";

type InspectionContextValue = {
  inspection: FullInspection;
  refetch: () => Promise<void>;
  /**
   * Applies `localUpdater` to local state immediately (optimistic UI, works offline),
   * then runs `apiCall`. On success the state is reconciled with the server response.
   * On a network error the local change is kept (queued for later sync) and the user
   * is informed; on any other error the local change is reverted via a refetch.
   */
  applyAndSave: (
    localUpdater: (prev: FullInspection) => FullInspection,
    apiCall: () => Promise<unknown>
  ) => Promise<void>;
  /**
   * Creates a new nested record. Unlike edits this needs a server-assigned id, so it
   * cannot be applied optimistically offline — a clear error is shown instead.
   */
  create: <T>(
    apiCall: () => Promise<T>,
    updater: (prev: FullInspection, created: T) => FullInspection
  ) => Promise<T | null>;
};

const InspectionContext = createContext<InspectionContextValue | null>(null);

export function InspectionProvider({
  initialInspection,
  children,
}: {
  initialInspection: FullInspection;
  children: ReactNode;
}) {
  const [inspection, setInspection] = useState<FullInspection>(initialInspection);

  useEffect(() => {
    void cacheInspection(initialInspection.id, initialInspection);
  }, [initialInspection]);

  const refetch = useCallback(async () => {
    try {
      const fresh = await apiGet<FullInspection>(`/api/inspections/${initialInspection.id}`);
      setInspection(fresh);
      void cacheInspection(initialInspection.id, fresh);
    } catch (error) {
      if (error instanceof NetworkUnavailableError) {
        const cached = await getCachedInspection(initialInspection.id);
        if (cached) setInspection(cached.data as FullInspection);
      }
    }
  }, [initialInspection.id]);

  const applyAndSave = useCallback<InspectionContextValue["applyAndSave"]>(
    async (localUpdater, apiCall) => {
      setInspection((prev) => {
        const next = localUpdater(prev);
        void cacheInspection(next.id, next);
        return next;
      });
      try {
        await apiCall();
      } catch (error) {
        if (error instanceof NetworkUnavailableError) {
          toast.info("Uložené v zariadení — zosynchronizuje sa po pripojení.");
        } else {
          toast.error(error instanceof Error ? error.message : "Uloženie zlyhalo");
          await refetch();
        }
      }
    },
    [refetch]
  );

  const create = useCallback<InspectionContextValue["create"]>(async (apiCall, updater) => {
    try {
      const created = await apiCall();
      setInspection((prev) => {
        const next = updater(prev, created);
        void cacheInspection(next.id, next);
        return next;
      });
      return created;
    } catch (error) {
      if (error instanceof NetworkUnavailableError) {
        toast.error("Vytvorenie záznamu vyžaduje pripojenie na internet.");
      } else {
        toast.error(error instanceof Error ? error.message : "Vytvorenie zlyhalo");
      }
      return null;
    }
  }, []);

  return (
    <InspectionContext.Provider value={{ inspection, refetch, applyAndSave, create }}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspectionContext() {
  const ctx = useContext(InspectionContext);
  if (!ctx) throw new Error("useInspectionContext must be used within InspectionProvider");
  return ctx;
}
