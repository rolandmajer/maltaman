"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { flushMutationQueue, pendingMutationCount } from "./api-client";

export type SyncState = "online-synced" | "online-syncing" | "offline-pending" | "offline";

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Node 20+ exposes a minimal global `navigator` without `onLine`, so a plain `typeof navigator
// === "undefined"` guard isn't enough to detect SSR — useSyncExternalStore's getServerSnapshot is
// the correct tool here: it lets the server render a fixed "online" default while the client reads
// the real value, and React reconciles the difference on hydration without a mismatch warning.
function getConnectivitySnapshot() {
  return navigator.onLine;
}
function getServerConnectivitySnapshot() {
  return true;
}

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribeToConnectivity, getConnectivitySnapshot, getServerConnectivitySnapshot);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(() => {
    pendingMutationCount().then(setPendingCount);
  }, []);

  const trySync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await flushMutationQueue();
    } finally {
      setSyncing(false);
      refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    // Legitimate external-system side effect (starting a network sync when connectivity is
    // regained), not state derived from props — trySync's own setSyncing(true) just happens to
    // run synchronously before its first await, which trips the generic set-state-in-effect rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOnline) void trySync();
  }, [isOnline, trySync]);

  useEffect(() => {
    // Backup path: the browser's 'online' event is the primary trigger, but it can be missed
    // (e.g. a flaky connection that never fires a clean transition), so also retry periodically
    // whenever navigator.onLine is true and there's something left to sync.
    const interval = setInterval(() => {
      if (navigator.onLine) void trySync();
      else refreshPendingCount();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingCount, trySync]);

  const state: SyncState = !isOnline
    ? "offline"
    : syncing
      ? "online-syncing"
      : pendingCount > 0
        ? "offline-pending"
        : "online-synced";

  return { isOnline, pendingCount, syncing, state, trySync, refreshPendingCount };
}
