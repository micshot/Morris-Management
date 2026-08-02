"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchVapidKey, isInstalled, pushSupported, subscribe } from "@/lib/pushClient";

/* Asks for notification permission, but only inside an installed PWA.
 *
 * Two reasons for that gate. A browser-tab prompt is the classic annoyance and
 * gets dismissed permanently, burning the one chance you get. And on iOS the
 * Push API only exists once the app is added to the Home Screen, so prompting
 * in Safari would fail outright.
 *
 * Never auto-requests: the browser requires a user gesture, and ignoring that
 * leaves permission stuck in "default" forever. Anyone who taps "Not now" can
 * come back via the bell in the sidebar.
 */

export default function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  // Runs on every load for an already granted device, so a wiped database or
  // a rotated endpoint self-heals.
  const sync = useCallback(async (vapid: string) => {
    await subscribe(vapid);
  }, []);

  useEffect(() => {
    let dead = false;

    (async () => {
      if (!isInstalled() || !pushSupported()) return;
      if (Notification.permission === "denied") return;

      const vapid = await fetchVapidKey();
      if (!vapid || dead) return;
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
