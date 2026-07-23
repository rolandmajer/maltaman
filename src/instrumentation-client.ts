// Registers the offline service worker. Skipped in development so Turbopack's HMR
// and asset URLs are never shadowed by a stale cached response.
if (process.env.NODE_ENV === "production" && typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support degrades gracefully — the app remains fully usable online without it.
    });
  });
}
