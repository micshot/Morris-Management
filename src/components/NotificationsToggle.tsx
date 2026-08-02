"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchVapidKey,
  isInstalled,
  isSubscribed,
  pushSupported,
  subscribe,
  unsubscribe,
} from "@/lib/pushClient";

/* The second chance. The install-time prompt is one-shot, so anyone who tapped
 * "Not now" needs a way back in. Lives above Sign out in the rail.
 *
 * The one case this cannot rescue is a hard "Don't Allow": the browser locks
 * permission to "denied" and refuses every further request. We say so plainly
 * rather than firing a request that silently does nothing. */

type State = "off" | "on" | "denied" | "browser";

const BELL_ON = "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0";
const BELL_OFF = "M13.7 21a2 2 0 0 1-3.4 0M18.6 13A17 17 0 0 1 18 8a6 6 0 0 0-9.3-5M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14M2 2l20 20";

export default function NotificationsToggle() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pushSupported()) return setState(null);
    const vapid = await fetchVapidKey();
    if (!vapid) return setState(null); // server has no VAPID keys; stay quiet
    setKey(vapid);

    if (!isInstalled()) return setState("browser");
    if (Notification.permission === "denied") return setState("denied");
    setState((await isSubscribed()) ? "on" : "off");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggle() {
    if (busy || !state) return;
    setNote(null);

    if (state === "browser") {
      setNote("Add the app to your Home Screen first.");
      return;
    }
    if (state === "denied") {
      setNote("Blocked in settings. On iPhone: delete the Home Screen icon and add it again.");
      return;
    }

    setBusy(true);
    try {
      if (state === "on") {
        await unsubscribe();
        setState("off");
        setNote("Notifications off.");
      } else {
        const granted = await Notification.requestPermission();
        if (granted !== "granted") {
          setState(granted === "denied" ? "denied" : "off");
          setNote("Permission not given.");
          return;
        }
        if (key && (await subscribe(key))) {
          setState("on");
          setNote("Notifications on.");
        } else {
          setNote("Could not turn them on.");
        }
      }
    } catch {
      setNote("Could not turn them on.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  const on = state === "on";
  const title = on
    ? "Notifications on. Tap to turn off"
    : state === "denied"
      ? "Notifications blocked"
      : state === "browser"
        ? "Install the app to get notifications"
        : "Turn on notifications";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`rail-out rail-bell${on ? " is-on" : ""}`}
        title={title}
        aria-label={title}
        aria-pressed={on}
      >
        <span className="rail-icon">
          <svg
            viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <path d={on ? BELL_ON : BELL_OFF} />
          </svg>
        </span>
        <span className="rail-label">{on ? "Alerts on" : "Alerts off"}</span>
      </button>
      {note && <p className="rail-note">{note}</p>}
    </>
  );
}
