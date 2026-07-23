"use client";

import { offlineDb, type QueuedMutation } from "./db";

export class NetworkUnavailableError extends Error {
  constructor() {
    super("Sieť nie je dostupná");
    this.name = "NetworkUnavailableError";
  }
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new NetworkUnavailableError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Chyba požiadavky (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

export async function apiGet<T>(url: string): Promise<T> {
  return request(url, { method: "GET" }) as Promise<T>;
}

async function mutate(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  description: string
): Promise<unknown> {
  try {
    return await request(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof NetworkUnavailableError) {
      await queueMutation({ method, url, body, createdAt: Date.now(), description });
    }
    throw error;
  }
}

export const apiPost = <T>(url: string, body?: unknown, description = "Vytvorenie záznamu") =>
  mutate(url, "POST", body, description) as Promise<T>;
export const apiPatch = <T>(url: string, body?: unknown, description = "Úprava záznamu") =>
  mutate(url, "PATCH", body, description) as Promise<T>;
export const apiDelete = <T>(url: string, description = "Odstránenie záznamu") =>
  mutate(url, "DELETE", undefined, description) as Promise<T>;

export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  try {
    return (await request(url, { method: "POST", body: formData })) as T;
  } catch (error) {
    if (error instanceof NetworkUnavailableError) {
      // Binary uploads can't be replayed from a serialized queue entry (the File object isn't
      // persisted), so we surface this distinctly instead of silently queuing a broken retry.
      throw new Error("Nahrávanie fotografie vyžaduje pripojenie na internet. Skúste znova po obnovení siete.");
    }
    throw error;
  }
}

export async function queueMutation(mutation: Omit<QueuedMutation, "id">) {
  await offlineDb.mutationQueue.add(mutation);
}

export async function pendingMutationCount(): Promise<number> {
  return offlineDb.mutationQueue.count();
}

/** Replays queued mutations in order; stops on the first failure to preserve write ordering. */
export async function flushMutationQueue(): Promise<{ flushed: number; remaining: number }> {
  const queued = await offlineDb.mutationQueue.orderBy("createdAt").toArray();
  let flushed = 0;
  for (const item of queued) {
    try {
      await request(item.url, {
        method: item.method,
        headers: item.body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
      });
      if (item.id != null) await offlineDb.mutationQueue.delete(item.id);
      flushed++;
    } catch {
      break;
    }
  }
  const remaining = await offlineDb.mutationQueue.count();
  return { flushed, remaining };
}

export async function cacheInspection(id: string, data: unknown) {
  await offlineDb.inspections.put({ id, data, updatedAt: Date.now() });
}

export async function getCachedInspection(id: string) {
  return offlineDb.inspections.get(id);
}

export async function cacheInspectionList(key: string, data: unknown[]) {
  await offlineDb.lists.put({ key, data, updatedAt: Date.now() });
}

export async function getCachedInspectionList(key: string) {
  return offlineDb.lists.get(key);
}
