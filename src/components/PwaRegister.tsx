"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Registers the service worker and watches for a new deploy.
 *
 * The service worker file is static, so its bytes are identical between
 * deploys and the browser's own update check would never fire. The build
 * identity therefore comes from /api/version, which we poll hard:
 *
 *   - every 30 seconds while the tab is visible
 *   - the moment the tab regains focus or visibility
 *   - when the connection comes back
 *   - immediately on mount
 *
 * On a mismatch we bin every cache, drop the worker and reload. If the tab is
 * hidden we do it silently. If the realtor is looking at the screen we ask,
 * because reloading mid-edit would lose their typing.
 */

const POLL_MS = 30_000;

export default function PwaRegister() {
  const [stale, setStale] = useState(false);
  const known = useRef<string | null>(null);
  const applying = useRef(false);

  const apply = useCallback(async () => {
    if (applying.current) return;
    applying.current = true;
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // A failed cleanup must not block the reload.
    }
    window.location.reload();
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const { version } = (await res.json()) as { version?: string };
      if (!version) return;

      if (known.current === null) {
        known.current = version;
        navigator.serviceWorker?.controller?.postMessage({ type: "SET_VERSION", version });
        return;
      }
      if (version === known.current) return;

      known.current = version;
      if (document.visibilityState === "hidden") apply();
      else setStale(true);
    } catch {
      // Offline or mid-deploy. Try again on the next tick.
    }
  }, [apply]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
      // A worker swapping under us means the app code changed. Take it.
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!applying.current) window.location.reload();
      });
    }

    check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") check();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
      else if (stale) apply();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
    };
  }, [check, apply, stale]);

  if (!stale) return null;

  return (
    <div className="update-bar" role="status">
      <span>A new version is live.</span>
      <button type="button" className="btn btn-gold" onClick={apply}>
        Update now
      </button>
    </div>
  );
}
