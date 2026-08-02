/* Morris Management service worker.
 *
 * Deliberately conservative. This app is a live operations tool: a realtor
 * acting on a cached lead list from two deploys ago is worse than a realtor
 * seeing a loading spinner. So:
 *
 *   - Network first for everything. The cache is a fallback, never a source
 *     of truth.
 *   - /api/* is never cached. Ever. Lead data does not go to disk.
 *   - The cache is keyed by a version the server hands us. A new version
 *     wipes every old cache outright rather than trying to reconcile.
 *   - skipWaiting + clients.claim, so a new worker takes over immediately
 *     instead of waiting for every tab to close.
 */

const CACHE_PREFIX = "mm-shell-";
let CACHE_NAME = CACHE_PREFIX + "boot";

// The bare minimum to render something offline. Not the app data.
const SHELL = ["/offline", "/logo.png", "/logo-64.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(SHELL).catch(() => undefined)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await dropStaleCaches();
      await self.clients.claim();
    })(),
  );
});

async function dropStaleCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)),
  );
}

// The page tells us which build it is running. We re-key the cache to match
// and bin everything else.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SET_VERSION" || !data.version) return;
  const next = CACHE_PREFIX + data.version;
  if (next === CACHE_NAME) return;
  CACHE_NAME = next;
  event.waitUntil(dropStaleCaches());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Private data and the version probe must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        // Only bank successful, non-partial, basic responses.
        if (fresh && fresh.status === 200 && fresh.type === "basic") {
          const copy = fresh.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => undefined);
        }
        return fresh;
      } catch {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === "navigate") {
          const off = await caches.match("/offline");
          if (off) return off;
        }
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })(),
  );
});

/* ── Push ──────────────────────────────────────────────────────────────────
 * Payloads are small and deliberately vague about buyer data. The push
 * service is a third party, so the notification says what happened and where
 * to look, never a lead's phone number or budget. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Morris Management", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Morris Management";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo-180.png",
      badge: "/logo-64.png",
      tag: data.tag || "mm",
      renotify: !!data.tag,
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an open window if there is one; opening a second copy of an
      // installed app is disorienting.
      for (const c of all) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          if ("navigate" in c) await c.navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

// The push service can rotate an endpoint under us. Re-subscribe and tell the
// server, otherwise the device silently stops receiving anything.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch("/api/push/key");
        const { enabled, key } = await res.json();
        if (!enabled || !key) return;
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {
        // Nothing useful to do here; the next app open will re-register.
      }
    })(),
  );
});
