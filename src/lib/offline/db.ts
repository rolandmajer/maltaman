"use client";

import Dexie, { type Table } from "dexie";

export type QueuedMutation = {
  id?: number;
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  body?: unknown;
  isFormData?: boolean;
  formDataEntries?: [string, string][]; // for photo uploads queued offline (metadata only; binary re-selected on retry not supported)
  createdAt: number;
  description: string;
};

export type CachedInspection = {
  id: string;
  data: unknown; // full inspection JSON as returned by GET /api/inspections/[id]
  updatedAt: number;
};

export type CachedInspectionList = {
  key: string; // e.g. "list" for the dashboard collection
  data: unknown[];
  updatedAt: number;
};

class OfflineDatabase extends Dexie {
  inspections!: Table<CachedInspection, string>;
  lists!: Table<CachedInspectionList, string>;
  mutationQueue!: Table<QueuedMutation, number>;

  constructor() {
    super("maltaman-offline");
    this.version(1).stores({
      inspections: "id, updatedAt",
      lists: "key, updatedAt",
      mutationQueue: "++id, createdAt",
    });
  }
}

export const offlineDb = new OfflineDatabase();
