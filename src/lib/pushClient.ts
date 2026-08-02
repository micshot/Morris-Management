/* Browser-side push helpers. Shared by the install-time prompt and the bell in
 * the sidebar so the subscribe logic exists once. */

export function isInstalled() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return !!standalone || !!iosStandalone;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

export function toUint8(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function fetchVapidKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/key", { cache: "no-store" });
    const data = (await res.json()) as { enabled?: boolean; key?: string | null };
    return data.enabled && data.key ? data.key : null;
  } catch {
    return null;
  }
}

/* Creates the subscription if it does not exist and registers it server-side.
 * Safe to call on every load: the endpoint upserts, so a rotated endpoint or a
 * wiped table heals itself. */
export async function subscribe(vapid: string) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8(vapid),
    });
  }
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

export async function unsubscribe() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
  return true;
}

export async function isSubscribed() {
  if (!pushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  return !!(await reg.pushManager.getSubscription());
}
