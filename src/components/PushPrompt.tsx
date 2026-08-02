"use client";

import { useCallback, useEffect, useState } from "react";

/* Asks for notification permission, but only inside an installed PWA.
 *
 * Two reasons for that gate. A browser-tab prompt is the classic annoyance and
 * gets dismissed permanently, burning the one chance you get. And on iOS the
 * Push API only exists once the app is added to the Home Screen, so prompting
 * in Safari would fail outright.
 *
 * So: detect standalone display mode, confirm the server has VAPID configured,
 * then show a small opt-in. Never auto-request; the browser requires a user
 * gesture and silently ignoring that leaves permission in "default" forever.
 */

function isInstalled() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return !!standalone || !!iosStandalone;
}

function toUint8(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  // Sends the current subscription up. Runs on every load for an already
  // granted device, so a wiped database or a rotated endpoint self-heals.
  const sync = useCallback(async (vapid: string) => {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8(vapid),
      });
    }
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
  }, []);

  useEffect(() => {
    let dead = false;

    (async () => {
      if (!isInstalled()) return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "denied") return;

      let vapid: string | null = null;
      try {
        const res = await fetch("/api/push/key", { cache: "no-store" });
        const data = (await res.json()) as { enabled?: boolean; key?: string | null };
        if (!data.enabled || !data.key) return;
        vapid = data.key;
      } catch {
        return;
      }
      if (dead) return;
      setKey(vapid);

      if (Notification.permission === "granted") {
        // Already allowed: re-register quietly, no UI.
        sync(vapid).catch(() => undefined);
        return;
      }
      if (sessionStorage.getItem("mm_push_dismissed") === "1") return;
      setShow(true);
    })();

    return () => {
      dead = true;
    };
  }, [sync]);

  async function enable() {
    if (!key) return;
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") await sync(key);
    } catch {
      // Permission refused or subscribe failed. Nothing to recover.
    } finally {
      setBusy(false);
      setShow(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem("mm_push_dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="push-prompt" role="dialog" aria-label="Enable notifications">
      <div className="push-prompt-text">
        <strong>Get alerts on this device</strong>
        <span>Hot leads and new bookings, the moment they land.</span>
      </div>
      <div className="push-prompt-actions">
        <button type="button" className="btn btn-ghost" onClick={dismiss} disabled={busy}>
          Not now
        </button>
        <button type="button" className="btn btn-gold" onClick={enable} disabled={busy}>
          {busy ? "…" : "Allow"}
        </button>
      </div>
    </div>
  );
}
